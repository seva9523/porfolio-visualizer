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
  // CACHE (IMPORTANT FIX)
  // ============================
  const CACHE = {
    prices: {},
    xlm: null,
    pools: null,
    poolTimestamp: 0
  };

  const CACHE_TTL = 60 * 1000;

  // ============================
  // NORMALIZE (SAFE)
  // ============================
  function normalize(symbol) {
    if (!symbol) return null;
    return String(symbol)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "");
  }

  // ============================
  // COINGECKO
  // ============================
  async function fetchCoinGecko(id) {
    const now = Date.now();

    if (CACHE.prices[id] && CACHE.prices[id].time > now - CACHE_TTL) {
      return CACHE.prices[id].value;
    }

    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );

      const data = await res.json();
      const price = data?.[id]?.usd ?? null;

      CACHE.prices[id] = { value: price, time: now };

      return price;
    } catch {
      return null;
    }
  }

  async function getXLMPrice() {
    if (CACHE.xlm) return CACHE.xlm;
    const price = await fetchCoinGecko("stellar");
    CACHE.xlm = price;
    return price;
  }

  // ============================
  // DEX POOL CACHE (CRITICAL FIX)
  // ============================
  async function getPools() {
    const now = Date.now();

    if (CACHE.pools && now - CACHE.poolTimestamp < CACHE_TTL) {
      return CACHE.pools;
    }

    let url = "https://horizon.stellar.org/liquidity_pools?limit=200";
    let pools = [];

    while (url) {
      const res = await fetch(url);
      const data = await res.json();

      pools = pools.concat(data._embedded?.records || []);
      url = data._links?.next?.href || null;
    }

    CACHE.pools = pools;
    CACHE.poolTimestamp = now;

    return pools;
  }

  // ============================
  // DEX PRICE ENGINE (FIXED)
  // ============================
  async function fetchStellarDEXPrice(asset) {
    const clean = normalize(asset);
    const pools = await getPools();

    let best = null;
    let bestLiquidity = 0;

    for (const p of pools) {
      const a = p.reserves?.[0];
      const b = p.reserves?.[1];
      if (!a || !b) continue;

      const assetA = normalize(a.asset?.code || (a.asset_type === "native" ? "XLM" : ""));
      const assetB = normalize(b.asset?.code || (b.asset_type === "native" ? "XLM" : ""));

      const amtA = parseFloat(a.amount);
      const amtB = parseFloat(b.amount);
      const liquidity = parseFloat(p.total_shares || 0);

      let price = null;

      if (assetA === "XLM" && assetB === clean) {
        price = amtA / amtB;
      } else if (assetB === "XLM" && assetA === clean) {
        price = amtB / amtA;
      }

      if (price && liquidity > bestLiquidity) {
        best = price;
        bestLiquidity = liquidity;
      }
    }

    return best;
  }

  // ============================
  // PRICE ENGINE (FINAL FIXED FLOW)
  // ============================
  async function getLivePrice(symbol) {
    const clean = normalize(symbol);

    // 🔥 FIXED: USDC always first
    if (clean === "USDC") return 1;

    if (clean === "XLM" || clean === "YXLM") {
      return await getXLMPrice();
    }

    const COINGECKO_MAP = {
      ETH: "ethereum",
      BTC: "bitcoin",
      XRP: "ripple",
      USDT: "tether"
    };

    if (COINGECKO_MAP[clean]) {
      return await fetchCoinGecko(COINGECKO_MAP[clean]);
    }

    const dex = await fetchStellarDEXPrice(clean);
    if (dex !== null) return dex;

    const INTERNAL = {
      AQUA: 0.0032,
      HELIX: 0.015,
      FELIX: 0.08,
      YHELIX: 0.015
    };

    return INTERNAL[clean] ?? null;
  }

  // ============================
  // BALANCES
  // ============================
  async function fetchBalances(address) {
    const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);
    const data = await res.json();
    return data.balances || [];
  }

  // ============================
  // PORTFOLIO ENGINE (FIXED TOTALS)
  // ============================
  async function getPortfolio(addresses = []) {
    const portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    for (const addr of addresses) {
      const balances = await fetchBalances(addr);

      for (const b of balances) {
        const isNative = b.asset_type === "native";
        const symbol = normalize(isNative ? "XLM" : b.asset_code);

        const amount = parseFloat(b.balance);
        const price = await getLivePrice(symbol);

        // 🔥 FIXED VALUE LOGIC
        const value = price !== null ? amount * price : 0;

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = {
            symbol,
            name: TOKEN_METADATA[symbol]?.name || symbol,
            icon: TOKEN_METADATA[symbol]?.icon || "",
            totalAmount: 0,
            totalValueUSD: 0,
            priceUSD: price
          };
        }

        portfolio.assets[symbol].totalAmount += amount;
        portfolio.assets[symbol].totalValueUSD += value;
        portfolio.assets[symbol].priceUSD = price;

        portfolio.totalUSD += value;

        if (symbol === "XLM") {
          portfolio.totalXLM += amount;
        }
      }
    }

    return portfolio;
  }

  // ============================
  // UI
  // ============================
  async function renderPortfolio(container, addresses) {
    const data = await getPortfolio(addresses);

    const assets = Object.values(data.assets)
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);

    container.innerHTML = `
      <h2>Total Portfolio: $${data.totalUSD.toFixed(2)}</h2>
      <p>Wallets: ${data.wallets}</p>
    `;

    assets.forEach(a => {
      const div = document.createElement("div");
      div.style = "display:flex;gap:10px;padding:10px;border:1px solid #ddd;margin:8px;border-radius:8px;";

      div.innerHTML = `
        <img src="${a.icon}" width="28"/>
        <div>
          <strong>${a.name}</strong><br/>
          ${a.totalAmount.toFixed(2)} ${a.symbol}<br/>
          ${a.priceUSD ? `$${a.priceUSD.toFixed(4)}` : "Unpriced"} •
          $${a.totalValueUSD.toFixed(2)}
        </div>
      `;

      container.appendChild(div);
    });
  }

  return {
    getPortfolio,
    renderPortfolio,
    fetchBalances
  };

})();
