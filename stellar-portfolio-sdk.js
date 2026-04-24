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
    YHELIX: {
      name: "Yield Helix",
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    },
    YXLM: {
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
    COINGECKO: {},
    TIMESTAMP: {}
  };

  const CACHE_TTL = 60 * 1000; // 1 min

  // ----------------------------
  // NORMALIZE TOKEN SYMBOL
  // ----------------------------
  function normalize(symbol) {
    if (!symbol) return null;
    return String(symbol)
      .toUpperCase()
      .trim()
      .split(":")[0]
      .split("-")[0];
  }

  // ----------------------------
  // COINGECKO PRICE FETCH
  // ----------------------------
  async function fetchCoinGeckoPrice(id) {
    try {
      const now = Date.now();

      if (
        PRICE_CACHE.COINGECKO[id] &&
        PRICE_CACHE.TIMESTAMP[id] &&
        now - PRICE_CACHE.TIMESTAMP[id] < CACHE_TTL
      ) {
        return PRICE_CACHE.COINGECKO[id];
      }

      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );

      const data = await res.json();
      const price = data?.[id]?.usd ?? null;

      PRICE_CACHE.COINGECKO[id] = price;
      PRICE_CACHE.TIMESTAMP[id] = now;

      return price;
    } catch (e) {
      console.error("CoinGecko error:", e);
      return null;
    }
  }

  // ----------------------------
  // XLM PRICE
  // ----------------------------
  async function getXLMPrice() {
    if (PRICE_CACHE.XLM) return PRICE_CACHE.XLM;

    const price = await fetchCoinGeckoPrice("stellar");
    PRICE_CACHE.XLM = price;
    return price;
  }

  // ----------------------------
  // TOKEN PRICE ENGINE (HYBRID)
  // ----------------------------
  async function getLivePrice(symbol) {
    const clean = normalize(symbol);
    if (!clean) return null;

    // Stablecoin
    if (clean === "USDC") return 1;

    // Native XLM
    if (clean === "XLM") {
      return await getXLMPrice();
    }

    // Yield XLM alias
    if (clean === "YXLM") {
      return await getXLMPrice();
    }

    // Manual fallback prices (only for small ecosystem tokens)
    const MANUAL_PRICES = {
      AQUA: 0.0032,
      HELIX: 0.015,
      FELIX: 0.08,
      YHELIX: 0.015
    };

    if (MANUAL_PRICES[clean] !== undefined) {
      return MANUAL_PRICES[clean];
    }

    // Try CoinGecko fallback for known majors
    const COINGECKO_MAP = {
      ETH: "ethereum",
      BTC: "bitcoin",
      XRP: "ripple"
    };

    if (COINGECKO_MAP[clean]) {
      return await fetchCoinGeckoPrice(COINGECKO_MAP[clean]);
    }

    console.warn("No price found for:", clean);
    return null;
  }

  // ----------------------------
  // FETCH STELLAR BALANCES
  // ----------------------------
  async function fetchStellarBalances(publicKey) {
    try {
      const res = await fetch(
        `https://horizon.stellar.org/accounts/${publicKey}`
      );
      if (!res.ok) throw new Error("Account not found");

      const data = await res.json();
      return data.balances || [];
    } catch (error) {
      console.error("Balance fetch error:", error);
      return [];
    }
  }

  // ----------------------------
  // METADATA
  // ----------------------------
  function getMeta(symbol, isNative) {
    const clean = normalize(symbol);

    return TOKEN_METADATA[clean] || {
      name: clean || "Unknown",
      icon:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ccc'/%3E%3C/svg%3E",
      type: isNative ? "native" : "token"
    };
  }

  // ----------------------------
  // PORTFOLIO ENGINE
  // ----------------------------
  async function getPortfolio(addresses = []) {
    const portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    for (let address of addresses) {
      const balances = await fetchStellarBalances(address);

      for (let b of balances) {
        const isNative = b.asset_type === "native";
        const symbol = normalize(isNative ? "XLM" : b.asset_code);

        const amount = parseFloat(b.balance);
        const meta = getMeta(symbol, isNative);

        const price = await getLivePrice(symbol);

        const valueUSD =
          price !== null && !isNaN(price) ? amount * price : 0;

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = {
            symbol,
            name: meta.name,
            icon: meta.icon,
            totalAmount: 0,
            totalValueUSD: 0,
            priceUSD: price,
            type: meta.type
          };
        }

        portfolio.assets[symbol].totalAmount += amount;
        portfolio.assets[symbol].totalValueUSD += valueUSD;
        portfolio.assets[symbol].priceUSD = price;

        portfolio.totalUSD += valueUSD;

        if (symbol === "XLM") {
          portfolio.totalXLM += amount;
        }
      }
    }

    return portfolio;
  }

  // ----------------------------
  // UI RENDER
  // ----------------------------
  async function renderPortfolio(container, addresses) {
    const data = await getPortfolio(addresses);

    const assets = Object.values(data.assets)
      .filter(a => a.totalAmount > 0)
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);

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
          ${a.totalAmount.toFixed(2)} ${a.symbol}<br/>
          ${
            a.priceUSD
              ? `$${a.priceUSD.toFixed(4)} • $${a.totalValueUSD.toFixed(2)}`
              : "Unpriced"
          }
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
