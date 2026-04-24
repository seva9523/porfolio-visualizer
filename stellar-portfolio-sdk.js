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
    },
    HELIX: {
      name: "Helix Token",
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    },
    FELIX: {
      name: "Felix Token",
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    }
  };

  // ----------------------------
  // PRICE CACHE
  // ----------------------------
  const PRICE_CACHE = {
    XLM: null,
    USDC: 1
  };

  // ----------------------------
  // FETCH XLM PRICE
  // ----------------------------
  async function fetchXLMPrice() {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );
    const data = await res.json();
    return data.stellar.usd;
  }

  // ----------------------------
  // HYBRID PRICING ENGINE
  // ----------------------------
  async function getLivePrice(symbol) {

    if (!symbol) return null;

    // XLM live price
    if (symbol === "XLM") {
      if (!PRICE_CACHE.XLM) {
        PRICE_CACHE.XLM = await fetchXLMPrice();
      }
      return PRICE_CACHE.XLM;
    }

    // stablecoin
    if (symbol === "USDC") return 1;

    // manual pricing layer
    const MANUAL_PRICES = {
      AQUA: 0.0032,
      HELIX: 0.015,
      FELIX: 0.08
    };

    return MANUAL_PRICES[symbol] ?? null;
  }

  // ----------------------------
  // STELLAR API
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
  // PORTFOLIO ENGINE
  // ----------------------------
  async function getPortfolio(addresses = []) {

    let portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

 for (let b of data.balances) {

  const isNative = b.asset_type === "native";

  // 1. ALWAYS normalize FIRST
  let symbol = isNative ? "XLM" : b.asset_code;

  symbol = String(symbol)
    .toUpperCase()
    .trim()
    .split(":")[0];   // removes issuer part

  const amount = parseFloat(b.balance);

  const meta = getMeta(symbol, isNative);

  // 2. NOW pricing
  const price = await getLivePrice(symbol);

  const valueUSD = price ? amount * price : 0;

  console.log("DEBUG:", symbol, price, amount); // TEMP DEBUG

  if (!portfolio.assets[symbol]) {
    portfolio.assets[symbol] = {
      symbol,
      name: meta.name,
      icon: meta.icon,
      amount: 0,
      valueUSD: 0,
      priceUSD: price
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
  // UI LAYER
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
          ${a.priceUSD ? "$" + a.valueUSD.toFixed(2) : "Unpriced"}
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
