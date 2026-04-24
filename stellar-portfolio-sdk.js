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
    },
    yHELIX: {
      name: "Yield Helix",
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    },
    yXLM: {
      name: "Yield XLM",
      icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png",
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
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
      );
      const data = await res.json();
      return data.stellar.usd;
    } catch (error) {
      console.error("Failed to fetch XLM price:", error);
      return null;
    }
  }

  // ----------------------------
  // GET METADATA HELPER
  // ----------------------------
  function getMeta(symbol, isNative = false) {
    return TOKEN_METADATA[symbol] || {
      name: symbol,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ccc'/%3E%3C/svg%3E",
      type: isNative ? "native" : "token"
    };
  }

  // ----------------------------
  // HYBRID PRICING ENGINE
  // ----------------------------
  async function getLivePrice(symbol) {
    if (!symbol) return null;

    // STEP 1: HARD NORMALIZATION
    const clean = String(symbol)
      .toUpperCase()
      .trim()
      .split(":")[0]
      .split("-")[0];

    // STEP 2: XLM live price
    if (clean === "XLM") {
      if (!PRICE_CACHE.XLM) {
        PRICE_CACHE.XLM = await fetchXLMPrice();
      }
      return PRICE_CACHE.XLM;
    }

    // STEP 3: stablecoin
    if (clean === "USDC") return 1;

    // STEP 4: manual pricing registry
    const MANUAL_PRICES = {
      AQUA: 0.0032,
      HELIX: 0.015,
      FELIX: 0.08,
      yHELIX: 0.015,    // Same as HELIX (assume 1:1 yield)
      yXLM: null         // Gets XLM price dynamically
    };

    // Special case: yXLM should track XLM price
    if (clean === "yXLM") {
      if (!PRICE_CACHE.XLM) {
        PRICE_CACHE.XLM = await fetchXLMPrice();
      }
      return PRICE_CACHE.XLM;
    }

    const price = MANUAL_PRICES[clean];
    console.log("PRICE CHECK:", clean, price);
    return price ?? null;
  }

  // ----------------------------
  // FETCH STELLAR BALANCES
  // ----------------------------
  async function fetchStellarBalances(publicKey) {
    try {
      const res = await fetch(
        `https://horizon.stellar.org/accounts/${publicKey}`
      );
      if (!res.ok) throw new Error(`Account not found: ${publicKey}`);
      const data = await res.json();
      return data.balances;
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      return [];
    }
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

    // Fetch balances for all addresses
    for (let address of addresses) {
      const balances = await fetchStellarBalances(address);

      for (let b of balances) {
        const isNative = b.asset_type === "native";
        // 1. ALWAYS normalize FIRST
        let symbol = isNative ? "XLM" : b.asset_code;
        symbol = String(symbol)
          .toUpperCase()
          .trim()
          .split(":")[0]; // removes issuer part

        const amount = parseFloat(b.balance);
        const meta = getMeta(symbol, isNative);

        // 2. NOW pricing
        const price = await getLivePrice(symbol);
        const valueUSD = price ? amount * price : 0;

        console.log("DEBUG:", symbol, price, amount, valueUSD);

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
        portfolio.assets[symbol].priceUSD = price; // Update price
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
        <img src="${a.icon}" width="28" height="28" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23ccc%22/%3E%3C/svg%3E'" />
        <div>
          <strong>${a.name}</strong><br/>
          ${a.amount.toFixed(2)} ${a.symbol}<br/>
          ${a.priceUSD ? "$" + a.priceUSD.toFixed(4) + " × $" + a.valueUSD.toFixed(2) : "Unpriced"}
        </div>
      `;
      container.appendChild(card);
    });
  }

  return {
    getPortfolio,
    renderPortfolio,
    fetchStellarBalances
  };
})();
