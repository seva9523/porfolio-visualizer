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
  // ALIASES (WRAPPED TOKENS)
  // ============================
  const TOKEN_ALIASES = {
    YXLM: "XLM",
    YBTC: "BTC",
    YETH: "ETH",
    YUSDC: "USDC"
  };

  // ============================
  // STABLECOINS
  // ============================
  const STABLE_FIAT_MAP = {
    USDC: "USD",
    USDT: "USD",
    PYUSD: "USD",
    USDX: "USD",
    USDY: "USD",
    EURC: "EUR",
    EURX: "EUR",
    GBPx: "GBP",
    GBPX: "GBP"
  };

  // ============================
  // CACHE
  // ============================
  const CACHE = {
    prices: {},
    fx: {},
    xlm: null,
    pools: null,
    poolTime: 0
  };

  const CACHE_TTL = 60000;

  // ============================
  // NORMALIZE SAFE
  // ============================
  function normalize(s) {
    if (!s) return null;
    return String(s).toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
  }

  function safeSymbol(b) {
    if (b.asset_type === "native") return "XLM";
    return normalize(b.asset_code || "UNKNOWN");
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
    const p = await fetchCoinGecko("stellar");
    CACHE.xlm = p;
    return p;
  }

  // ============================
  // FX
  // ============================
  async function getFX(currency) {
    const now = Date.now();

    if (CACHE.fx[currency] && CACHE.fx[currency].time > now - CACHE_TTL) {
      return CACHE.fx[currency].value;
    }

    try {
      const res = await fetch(
        `https://api.exchangerate.host/latest?base=${currency}&symbols=USD`
      );

      const data = await res.json();
      const rate = data?.rates?.USD ?? null;

      CACHE.fx[currency] = { value: rate, time: now };

      return rate;
    } catch {
      return null;
    }
  }

  function isStable(s) {
    return STABLE_FIAT_MAP[s] !== undefined;
  }

  // ============================
  // DEX POOLS
  // ============================
  async function getPools() {
    const now = Date.now();

    if (CACHE.pools && now - CACHE.poolTime < CACHE_TTL) {
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
    CACHE.poolTime = now;

    return pools;
  }

  async function fetchDEXPrice(asset) {
    const clean = normalize(asset);
    const pools = await getPools();

    let best = null;
    let bestLiquidity = 0;

    for (const p of pools) {
      const a = p.reserves?.[0];
      const b = p.reserves?.[1];
      if (!a || !b) continue;

      const A = normalize(a.asset?.code || (a.asset_type === "native" ? "XLM" : ""));
      const B = normalize(b.asset?.code || (b.asset_type === "native" ? "XLM" : ""));

      const amtA = parseFloat(a.amount);
      const amtB = parseFloat(b.amount);
      const liq = parseFloat(p.total_shares || 0);

      let price = null;

      if (A === "XLM" && B === clean) {
        price = amtA / amtB;
      } else if (B === "XLM" && A === clean) {
        price = amtB / amtA;
      }

      if (price && liq > bestLiquidity) {
        best = price;
        bestLiquidity = liq;
      }
    }

    return best;
  }

  // ============================
  // PRICE ENGINE
  // ============================
  async function getPrice(symbol) {
    let clean = normalize(symbol);
    clean = TOKEN_ALIASES[clean] || clean;

    if (isStable(clean)) {
      const fiat = STABLE_FIAT_MAP[clean];
      const fx = await getFX(fiat);
      return fx ?? (fiat === "USD" ? 1 : null);
    }

    if (clean === "XLM") return await getXLMPrice();

    const CG = {
      BTC: "bitcoin",
      ETH: "ethereum",
      XRP: "ripple",
      USDT: "tether"
    };

    if (CG[clean]) {
      const p = await fetchCoinGecko(CG[clean]);
      return p;
    }

    const dex = await fetchDEXPrice(clean);
    if (dex !== null) return dex;

    return null;
  }

  // ============================
  // BALANCES
  // ============================
  async function fetchBalances(addr) {
    const res = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
    const data = await res.json();
    return data.balances || [];
  }

  // ============================
  // PORTFOLIO (FIXED - NO 0 BUGS)
  // ============================
  async function getPortfolio(addresses = []) {

    const portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    const allSymbols = new Set();
    const rawData = [];

    // STEP 1: collect everything safely
    for (const addr of addresses) {
      const balances = await fetchBalances(addr);

      for (const b of balances) {
        const symbol = safeSymbol(b);
        if (!symbol || symbol === "UNKNOWN") continue;

        const amount = parseFloat(b.balance);

        rawData.push({ symbol, amount });

        allSymbols.add(symbol);
      }
    }

    // STEP 2: batch price fetch (CRITICAL FIX)
    const priceMap = {};
    await Promise.all([...allSymbols].map(async (s) => {
      priceMap[s] = await getPrice(s);
    }));

    // STEP 3: build portfolio
    for (const item of rawData) {
      const { symbol, amount } = item;

      const price = priceMap[symbol];
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

      portfolio.totalUSD += value;

      if (symbol === "XLM") {
        portfolio.totalXLM += amount;
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
