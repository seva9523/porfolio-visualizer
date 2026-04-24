window.StellarPortfolio = (() => {

  // ============================
  // TOKEN METADATA
  // ============================
  const TOKEN_METADATA = {
    XLM: { name: "Stellar Lumens", icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png", type: "native" },
    USDC: { name: "USD Coin", icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png", type: "token" },
    AQUA: { name: "Aqua Token", icon: "https://aqua.network/logo.png", type: "token" },
    HELIX: { name: "Helix Token", icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png", type: "token" },
    FELIX: { name: "Felix Token", icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png", type: "token" },
    YHELIX: { name: "Yield Helix", icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png", type: "token" },
    YXLM: { name: "Yield XLM", icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png", type: "token" }
  };

  // ============================
  // CACHE
  // ============================
  const CACHE = {
    prices: {},
    timestamp: {},
    xlm: null
  };

  const CACHE_TTL = 60 * 1000;

  // ============================
  // NORMALIZATION (FIXED)
  // ============================
  function normalize(symbol) {
    if (!symbol) return null;

    return String(symbol)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "");
  }

  // ============================
  // COINGECKO FETCH
  // ============================
  async function fetchCoinGecko(id) {
    const now = Date.now();

    if (CACHE.prices[id] && CACHE.timestamp[id] && now - CACHE.timestamp[id] < CACHE_TTL) {
      return CACHE.prices[id];
    }

    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );

      const data = await res.json();
      const price = data?.[id]?.usd ?? null;

      CACHE.prices[id] = price;
      CACHE.timestamp[id] = now;

      return price;
    } catch (e) {
      console.error("CoinGecko error:", e);
      return null;
    }
  }

  // ============================
  // XLM PRICE
  // ============================
  async function getXLMPrice() {
    if (CACHE.xlm) return CACHE.xlm;

    const price = await fetchCoinGecko("stellar");
    CACHE.xlm = price;

    return price;
  }

  // ============================
  // PRICE ENGINE (PRODUCTION)
  // ============================
  async function getLivePrice(symbol) {
    const clean = normalize(symbol);
    if (!clean) return null;

    // Stablecoin
    if (clean === "USDC") return 1;

    // XLM + aliases
    if (clean === "XLM" || clean === "YXLM") {
      return await getXLMPrice();
    }

    // Internal ecosystem tokens (manual fallback)
    const INTERNAL_PRICES = {
      AQUA: 0.0032,
      HELIX: 0.015,
      FELIX: 0.08,
      YHELIX: 0.015
    };

    if (INTERNAL_PRICES[clean] !== undefined) {
      return INTERNAL_PRICES[clean];
    }

    // Major external tokens via CoinGecko mapping
    const COINGECKO_MAP = {
      ETH: "ethereum",
      BTC: "bitcoin",
      XRP: "ripple",
      USDT: "tether"
    };

    if (COINGECKO_MAP[clean]) {
      return await fetchCoinGecko(COINGECKO_MAP[clean]);
    }

    // FINAL FALLBACK: unknown asset
    console.warn("⚠️ Unpriced asset:", clean);
    return null;
  }

  // ============================
  // STELLAR BALANCES
  // ============================
  async function fetchBalances(address) {
    try {
      const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);
      if (!res.ok) throw new Error("Account not found");

      const data = await res.json();
      return data.balances || [];
    } catch (e) {
      console.error("Balance fetch error:", e);
      return [];
    }
  }

  // ============================
  // METADATA
  // ============================
  function getMeta(symbol, isNative) {
    const clean = normalize(symbol);

    return TOKEN_METADATA[clean] || {
      name: clean || "Unknown",
      icon:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%23ccc'/%3E%3C/svg%3E",
      type: isNative ? "native" : "token"
    };
  }

  // ============================
  // PORTFOLIO ENGINE
  // ============================
  async function getPortfolio(addresses = []) {
    const portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {},
      unpriced: []
    };

    for (const address of addresses) {
      const balances = await fetchBalances(address);

      for (const b of balances) {
        const isNative = b.asset_type === "native";
        const symbol = normalize(isNative ? "XLM" : b.asset_code);

        const amount = parseFloat(b.balance);
        const meta = getMeta(symbol, isNative);

        const price = await getLivePrice(symbol);
        const value = price ? amount * price : null;

        // Track unpriced assets (IMPORTANT FIX)
        if (price === null) {
          portfolio.unpriced.push(symbol);
        }

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = {
            symbol,
            name: meta.name,
            icon: meta.icon,
            totalAmount: 0,
            totalValueUSD: 0,
            priceUSD: price,
            type: meta.type,
            isUnpriced: false
          };
        }

        portfolio.assets[symbol].totalAmount += amount;
        portfolio.assets[symbol].priceUSD = price;

        if (value !== null) {
          portfolio.assets[symbol].totalValueUSD += value;
          portfolio.totalUSD += value;
        } else {
          portfolio.assets[symbol].isUnpriced = true;
        }

        if (symbol === "XLM") {
          portfolio.totalXLM += amount;
        }
      }
    }

    return portfolio;
  }

  // ============================
  // RENDER UI
  // ============================
  async function renderPortfolio(container, addresses) {
    const data = await getPortfolio(addresses);

    const assets = Object.values(data.assets)
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

      const priceDisplay = a.priceUSD
        ? `$${a.priceUSD.toFixed(4)}`
        : "⚠️ Unpriced";

      const valueDisplay = a.isUnpriced
        ? "No USD value available"
        : `$${a.totalValueUSD.toFixed(2)}`;

      card.innerHTML = `
        <img src="${a.icon}" width="28" height="28" />
        <div>
          <strong>${a.name}</strong><br/>
          ${a.totalAmount.toFixed(2)} ${a.symbol}<br/>
          ${priceDisplay} • ${valueDisplay}
        </div>
      `;

      container.appendChild(card);
    });
  }

  return {
    getPortfolio,
    renderPortfolio,
    fetchBalances
  };

})();
