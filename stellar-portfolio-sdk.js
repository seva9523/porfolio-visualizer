window.StellarPortfolio = (() => {

  // ============================
  // METADATA
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
    xlm: null,
    gecko: {},
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

  // ============================
  // COINGECKO
  // ============================
  async function coinGecko(id) {
    const now = Date.now();
    if (CACHE.prices[id] && CACHE.time[id] > now - TTL) {
      return CACHE.prices[id];
    }

    try {
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      const d = await r.json();
      const p = d?.[id]?.usd ?? null;

      CACHE.prices[id] = p;
      CACHE.time[id] = now;

      return p;
    } catch {
      return null;
    }
  }

  // ============================
  // GECKOTERMINAL (🔥 MAIN FIX)
  // ============================
  async function geckoTerminalPrice(symbol) {
    const clean = norm(symbol);

    if (CACHE.gecko[clean] && CACHE.time[clean] > Date.now() - TTL) {
      return CACHE.gecko[clean];
    }

    try {
      // 🔥 search pools on Stellar chain
      const url = `https://api.geckoterminal.com/api/v2/networks/stellar/tokens/${clean}`;

      const res = await fetch(url);
      const data = await res.json();

      // IMPORTANT: GeckoTerminal structure varies
      const price =
        data?.data?.attributes?.price_usd ||
        data?.data?.attributes?.price ||
        null;

      CACHE.gecko[clean] = price;
      CACHE.time[clean] = Date.now();

      return price;
    } catch {
      return null;
    }
  }

  // ============================
  // XLM PRICE
  // ============================
  async function xlmPrice() {
    if (CACHE.xlm) return CACHE.xlm;
    const p = await coinGecko("stellar");
    CACHE.xlm = p;
    return p;
  }

  // ============================
  // PRICE ENGINE (FIXED PRIORITY)
  // ============================
  async function price(symbol) {
    const s = norm(symbol);

    if (!s) return null;

    // stablecoin
    if (s === "USDC") return 1;

    // XLM
    if (s === "XLM") return await xlmPrice();

    // 1️⃣ GECKOTERMINAL FIRST (CRITICAL FIX)
    const gt = await geckoTerminalPrice(s);
    if (gt !== null) return gt;

    // 2️⃣ COINGECKO fallback
    const map = {
      BTC: "bitcoin",
      ETH: "ethereum",
      XRP: "ripple"
    };

    if (map[s]) {
      return await coinGecko(map[s]);
    }

    return null;
  }

  // ============================
  // BALANCES
  // ============================
  async function balances(addr) {
    const r = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
    const d = await r.json();
    return d.balances || [];
  }

  // ============================
  // PORTFOLIO (FIXED)
  // ============================
  async function portfolio(addresses = []) {

    const out = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    const symbols = new Set();
    const rows = [];

    for (const a of addresses) {
      const b = await balances(a);

      for (const x of b) {
        const s = x.asset_type === "native" ? "XLM" : norm(x.asset_code);
        const amt = parseFloat(x.balance);

        if (!s) continue;

        symbols.add(s);
        rows.push({ s, amt });
      }
    }

    const prices = {};
    await Promise.all([...symbols].map(async (s) => {
      prices[s] = await price(s);
    }));

    for (const r of rows) {
      const p = prices[r.s];
      const val = p ? r.amt * p : 0;

      if (!out.assets[r.s]) {
        out.assets[r.s] = {
          symbol: r.s,
          name: TOKEN_METADATA[r.s]?.name || r.s,
          totalAmount: 0,
          totalValueUSD: 0,
          priceUSD: p
        };
      }

      out.assets[r.s].totalAmount += r.amt;
      out.assets[r.s].totalValueUSD += val;

      out.totalUSD += val;

      if (r.s === "XLM") out.totalXLM += r.amt;
    }

    return out;
  }

  // ============================
  // UI
  // ============================
  async function render(el, addrs) {
    const d = await portfolio(addrs);

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
