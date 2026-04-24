window.StellarPortfolio = (() => {

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

  const COINGECKO_URL =
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";

  async function getXLMPrice() {
    const res = await fetch(COINGECKO_URL);
    const data = await res.json();
    return data.stellar.usd;
  }

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

  async function getPortfolio(addresses = []) {

    const xlmPrice = await getXLMPrice();

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

      data.balances.forEach(b => {

        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : b.asset_code;
        const amount = parseFloat(b.balance);

        const meta = getMeta(symbol, isNative);
        const valueUSD = isNative ? amount * xlmPrice : 0;

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

        if (isNative) {
          portfolio.totalXLM += amount;
          portfolio.totalUSD += valueUSD;
        }
      });
    }

    return portfolio;
  }

  // 🧠 NEW: UI RENDER LAYER
  async function renderPortfolio(container, addresses) {

    const data = await getPortfolio(addresses);
    const assets = Object.values(data.assets);

    container.innerHTML = "";

    const summary = document.createElement("div");
    summary.innerHTML = `
      <h3>Total Value: $${data.totalUSD.toFixed(2)}</h3>
      <p>Wallets: ${data.wallets}</p>
    `;

    container.appendChild(summary);

    assets.forEach(a => {

      const card = document.createElement("div");
      card.style = `
        display:flex;
        align-items:center;
        gap:10px;
        border:1px solid #ddd;
        padding:10px;
        margin:10px 0;
        border-radius:8px;
      `;

      card.innerHTML = `
        <img src="${a.icon}" width="30" height="30" />
        <div>
          <strong>${a.name}</strong><br/>
          ${a.amount.toFixed(2)}<br/>
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
