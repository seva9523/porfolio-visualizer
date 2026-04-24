window.StellarPortfolio = (() => {

  // ----------------------------
  // TOKEN METADATA
  // ----------------------------
  const TOKEN_METADATA = {
    XLM: {
      name: "Stellar Lumens",
      icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png",
      type: "native"
    },
    USDC: {
      name: "USD Coin",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      type: "token"
    },
    AQUA: {
      name: "Aqua Token",
      icon: "https://aqua.network/logo.png",
      type: "token"
    }
  };

  // ----------------------------
  // PRICING ENGINE
  // ----------------------------
  const PRICE_CACHE = {
    XLM: null,
    USDC: 1
  };

  async function fetchXLMPrice() {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );
    const data = await res.json();
    return data.stellar.usd;
  }

  async function getPrice(symbol) {

    // 1. Native XLM price (live)
    if (symbol === "XLM") {
      if (!PRICE_CACHE.XLM) {
        PRICE_CACHE.XLM = await fetchXLMPrice();
      }
      return PRICE_CACHE.XLM;
    }

    // 2. Stablecoins
    if (symbol === "USDC") return 1;

    // 3. Unknown tokens (fallback logic)
    // NOTE: real infra would use DEX / orderbook / oracle later
    return 0;
  }

  // ----------------------------
  // STELLAR DATA FETCH
  // ----------------------------
  async function fetchAccount(address) {
    const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);
    if (!res.ok) throw new Error("Account not found: " + address);
    return await res.json();
  }

  function getMeta(symbol, isNative) {
    if (isNative) return TOKEN_METADATA.XLM;

    return TOKEN_METADATA[symbol] || {
      name: symbol,
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    };
  }

  // ----------------------------
  // CORE PORTFOLIO ENGINE
  // ----------------------------
  async function getPortfolio(addresses = []) {

    let portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    for (let addr of addresses) {

      let data;

      try {
        data = await fetchAccount(addr);
      } catch (e) {
        continue;
      }

      for (let b of data.balances) {

        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : b.asset_code;
        const amount = parseFloat(b.balance);

        const meta = getMeta(symbol, isNative);
        const price = await getPrice(symbol);

        const valueUSD = amount * price;

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = {
            symbol,
            name: meta.name,
            icon: meta.icon,
            amount: 0,
            valueUSD: 0
          };
        }

        portfolio.assets[symbol].amount += amount;
        portfolio.assets[symbol].valueUSD += valueUSD;

        portfolio.totalUSD += valueUSD;

        if (symbol === "XLM") {
          portfolio.totalXLM += amount;
        }
      }
    }

    return portfolio;
  }

  // ----------------------------
  // UI RENDER LAYER
  // ----------------------------
  async function renderPortfolio(container, addresses) {

    const data = await getPortfolio(addresses);
    const assets = Object.values(data.assets)
      .filter(a => a.amount > 0)
      .sort((a, b) => b.valueUSD - a.valueUSD);

    container.innerHTML = "";

    const header = document.createElement("div");
    header.innerHTML = `
      <h2>Total Portfolio: $${data.totalUSD.toFixed(2)}</h2>
      <p>Wallets: ${data.wallets}</p>
    `;
    container.appendChild(header);

    assets.forEach(a => {

      const card = document.createElement("div");
      card.style = `
        display:flex;
        align-items:center;
        gap:10px;
        border:1px solid #ddd;
        padding:10px;
        margin:10px 0;
        border-radius:10px;
      `;

      card.innerHTML = `
        <img src="${a.icon}" width="28" height="28" />
        <div>
          <strong>${a.name}</strong><br/>
          ${a.amount.toFixed(2)} ${a.symbol}<br/>
          $${a.valueUSD.toFixed(2)}
        </div>
      `;

      container.appendChild(card);
    });
  }

  return {
    getPortfolio,
    renderPortfolio
  };

})();
