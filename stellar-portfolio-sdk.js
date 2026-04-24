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
    YXLM: { name: "Yield XLM", icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png", type: "token" }
  };

  // ============================
  // CACHE
  // ============================
  const CACHE = {
    prices: {},
    fx: {},
    xlm: null,
    pools: {},
    time: {}
  };

  const TTL = 60 * 1000;

  // ============================
  // NORMALIZE
  // ============================
  function norm(s) {
    if (!s) return null;
    return String(s).toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
  }

  function safeSymbol(b) {
    return b.asset_type === "native"
      ? "XLM"
      : norm(b.asset_code || "UNKNOWN");
  }

  // ============================
  // COINGECKO
  // ============================
  async function coinGecko(id) {
    const now = Date.now();
    if (CACHE.prices[id] && CACHE.time[id] > now - TTL) {
      return CACHE.prices[id];
    }

    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );

      const data = await res.json();
      const price = data?.[id]?.usd ?? null;

      CACHE.prices[id] = price;
      CACHE.time[id] = now;

      return price;
    } catch {
      return null;
    }
  }

  async function xlmPrice() {
    if (CACHE.xlm) return CACHE.xlm;
    const p = await coinGecko("stellar");
    CACHE.xlm = p;
    return p;
  }

  // ============================
  // FX (stablecoins like EURC/GBPx)
  // ============================
  async function fx(currency) {
    const now = Date.now();
    if (CACHE.fx[currency] && CACHE.time[currency] > now - TTL) {
      return CACHE.fx[currency];
    }

    try {
      const res = await fetch(
        `https://api.exchangerate.host/latest?base=${currency}&symbols=USD`
      );

      const data = await res.json();
      const rate = data?.rates?.USD ?? null;

      CACHE.fx[currency] = rate;
      CACHE.time[currency] = now;

      return rate;
    } catch {
      return null;
    }
  }

  const STABLES = {
    USDC: "USD",
    USDT: "USD",
    PYUSD: "USD",
    EURC: "EUR",
    EURX: "EUR",
    GBPx: "GBP"
  };

  function isStable(s) {
    return STABLES[s] !== undefined;
  }

  // ============================
  // 🔥 GECKOTERMINAL (POOL BASED FIX)
  // ============================
  async function geckoPrice(symbol) {
    const s = norm(symbol);

    try {
      const res = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/stellar/pools?query=${s}`
      );

      const data = await res.json();
      const pools = data?.data || [];

      let best = null;
      let bestLiquidity = 0;

      for (const p of pools) {
        const a = p.attributes;

        const price = parseFloat(a.base_token_price_usd || a.price_usd || 0);
        const liquidity = parseFloat(a.reserve_in_usd || 0);

        if (!price || !liquidity) continue;

        if (liquidity > bestLiquidity) {
          best = price;
          bestLiquidity = liquidity;
        }
      }

      return best;
    } catch {
      return null;
    }
  }

  // ============================
  // ============================
// FINAL UNIFIED PRICE ENGINE
// ============================
async function getPrice(symbol) {
  const s = norm(symbol);
  if (!s) return null;

  // ----------------------------
  // STEP 1: XLM BASE
  // ----------------------------
  if (s === "XLM") return await xlmPrice();

  // ----------------------------
  // STEP 2: STABLECOINS VIA DEX (NOT FX)
// ----------------------------
  const stableOverrides = {
    USDC: "USDC",
    USDT: "USDT",
    PYUSD: "PYUSD",
    EURC: "EURC",
    EURX: "EURC",
    GBPX: "GBPX"
  };

  if (stableOverrides[s]) {
    const dex = await geckoPrice(s);
    if (dex !== null) return dex;

    // fallback ONLY if no liquidity exists
    return 1;
  }

  // ----------------------------
  // STEP 3: WRAPPED YIELDS (CRITICAL FIX)
// ----------------------------
  if (s.startsWith("Y")) {
    const underlying = s.replace("Y", "");

    const basePrice = await getPrice(underlying);

    // yield tokens inherit value of underlying
    return basePrice;
  }

  // ----------------------------
  // STEP 4: MAJORS
  // ----------------------------
  const cg = {
    BTC: "bitcoin",
    ETH: "ethereum",
    XRP: "ripple"
  };

  if (cg[s]) return await coinGecko(cg[s]);

  // ----------------------------
  // STEP 5: PRIMARY DEX
  // ----------------------------
  const dex = await geckoPrice(s);
  if (dex !== null) return dex;

  return null;
}

  // ============================
  // BALANCES
  // ============================
  async function balances(addr) {
    const res = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
    const data = await res.json();
    return data.balances || [];
  }

  // ============================
  // PORTFOLIO ENGINE (FIXED ZERO BUG)
  // ============================
  async function portfolio(addresses = []) {

    const out = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    const rows = [];
    const symbols = new Set();

    // STEP 1: collect balances
    for (const a of addresses) {
      const b = await balances(a);

      for (const x of b) {
        const s = safeSymbol(x);
        const amt = parseFloat(x.balance);

        if (!s) continue;

        rows.push({ s, amt });
        symbols.add(s);
      }
    }

    // STEP 2: batch pricing
    const prices = {};

    await Promise.all([...symbols].map(async (s) => {
      const p = await getPrice(s);
      prices[s] = (typeof p === "number" && p > 0) ? p : null;
    }));

    // STEP 3: compute portfolio
    for (const r of rows) {

      const price = prices[r.s];
      const value = price ? r.amt * price : 0;

      if (!out.assets[r.s]) {
        out.assets[r.s] = {
          symbol: r.s,
          name: TOKEN_METADATA[r.s]?.name || r.s,
          icon: TOKEN_METADATA[r.s]?.icon || "",
          totalAmount: 0,
          totalValueUSD: 0,
          priceUSD: price
        };
      }

      out.assets[r.s].totalAmount += r.amt;
      out.assets[r.s].totalValueUSD += value;

      out.totalUSD += value;

      if (r.s === "XLM") {
        out.totalXLM += r.amt;
      }
    }

    return out;
  }

  // ============================
  // UI
  // ============================
  async function render(el, addresses) {
    const d = await portfolio(addresses);

    const list = Object.values(d.assets)
      .sort((a, b) => b.totalValueUSD - a.totalValueUSD);

    el.innerHTML = `
      <h2>Total: $${d.totalUSD.toFixed(2)}</h2>
      <p>Wallets: ${d.wallets}</p>
    `;

    for (const a of list) {
      const div = document.createElement("div");

      div.style = "padding:10px;border:1px solid #ddd;margin:6px;border-radius:8px;display:flex;gap:10px";

      div.innerHTML = `
        <img src="${a.icon}" width="28"/>
        <div>
          <strong>${a.name}</strong><br/>
          ${a.totalAmount.toFixed(2)} ${a.symbol}<br/>
          ${a.priceUSD ? "$" + a.priceUSD.toFixed(6) : "Unpriced"} •
          $${a.totalValueUSD.toFixed(2)}
        </div>
      `;

      el.appendChild(div);
    }
  }

  return { portfolio, render };

})();
