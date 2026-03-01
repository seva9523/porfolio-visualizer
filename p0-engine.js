/* WealthView P0 Tools Engine (Library + Health Check + Multi-Backtest)
   Educational analysis only. No recommendations.
*/

(function () {
  const WV = (window.WV = window.WV || {});

  // ---- Storage helpers -------------------------------------------------
  WV.getPortfolios = function getPortfolios() {
    try {
      const raw = localStorage.getItem('portfolios');
      const obj = raw ? JSON.parse(raw) : null;
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  };

  WV.savePortfolios = function savePortfolios(portfolios) {
    localStorage.setItem('portfolios', JSON.stringify(portfolios || {}));
  };

  WV.getCurrentPortfolioId = function getCurrentPortfolioId() {
    const p = WV.getPortfolios();
    const saved = localStorage.getItem('currentPortfolio');
    if (saved && p[saved]) return saved;
    const first = Object.keys(p)[0];
    return first || null;
  };

  WV.setCurrentPortfolioId = function setCurrentPortfolioId(id) {
    localStorage.setItem('currentPortfolio', id);
  };

  WV.makeId = function makeId() {
    return 'p_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
  };

  WV.clone = function clone(x) {
    return JSON.parse(JSON.stringify(x));
  };

  // ---- Date helpers -----------------------------------------------------
  WV.toISO = function toISO(d) {
    const z = new Date(d);
    const y = z.getUTCFullYear();
    const m = String(z.getUTCMonth() + 1).padStart(2, '0');
    const day = String(z.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  WV.dateMonthsAgoISO = function dateMonthsAgoISO(months) {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return WV.toISO(d);
  };

  // ---- Data cache -------------------------------------------------------
  WV.cacheGet = function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  WV.cacheSet = function cacheSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(key + '_time', String(Date.now()));
    } catch {}
  };

  WV.cacheFresh = function cacheFresh(key, maxAgeMs) {
    const t = Number(localStorage.getItem(key + '_time') || '0');
    if (!t) return false;
    return (Date.now() - t) <= maxAgeMs;
  };

  // ---- Yahoo via /api/historical ---------------------------------------
  WV.fetchHistorical = async function fetchHistorical(symbol, fromISO, toISO) {
    const cacheKey = `wv_hist_${symbol}_${fromISO || '0'}_${toISO || '9'}`;
    const maxAge = 1000 * 60 * 60 * 12; // 12h

    if (WV.cacheFresh(cacheKey, maxAge)) {
      const cached = WV.cacheGet(cacheKey);
      if (cached && cached.data) return cached;
    }

    const url = `/api/historical?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(fromISO || '')}&to=${encodeURIComponent(toISO || '')}`;
    const res = await fetch(url);
    const json = await res.json();
    WV.cacheSet(cacheKey, json);
    return json;
  };

  WV.seriesFromHistorical = function seriesFromHistorical(histJson) {
    // returns [{date, close}...] sorted asc
    const data = histJson && histJson.data ? histJson.data : {};
    const arr = Object.keys(data)
      .map(k => ({ date: k, close: Number(data[k].close) }))
      .filter(x => Number.isFinite(x.close) && x.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  };

  // ---- Portfolio math ---------------------------------------------------
  WV.computeWeightsFromHoldings = async function computeWeightsFromHoldings(holdings, fromISO) {
    // weights based on shares * latest close (from historical)
    const clean = (holdings || []).filter(h => h && h.ticker && Number(h.shares) > 0);
    const tickers = [...new Set(clean.map(h => String(h.ticker).trim().toUpperCase()))];

    const prices = {};
    for (const t of tickers) {
      try {
        const hist = await WV.fetchHistorical(t, fromISO || WV.dateMonthsAgoISO(18), WV.toISO(new Date()));
        const series = WV.seriesFromHistorical(hist);
        const last = series[series.length - 1];
        if (last && last.close) prices[t] = last.close;
      } catch {
        // ignore
      }
    }

    const values = clean.map(h => {
      const t = String(h.ticker).trim().toUpperCase();
      const p = prices[t];
      return {
        ticker: t,
        shares: Number(h.shares) || 0,
        value: (Number(h.shares) || 0) * (Number(p) || 0)
      };
    }).filter(x => x.value > 0);

    const total = values.reduce((s, x) => s + x.value, 0);
    const weights = {};
    values.forEach(x => { weights[x.ticker] = x.value / total; });
    return { weights, prices, totalValue: total };
  };

  WV.mergeSeriesOnDates = function mergeSeriesOnDates(seriesByTicker) {
    // seriesByTicker: {TICKER: [{date, close}...]}
    // returns sorted dates common to all tickers
    const tickers = Object.keys(seriesByTicker);
    if (!tickers.length) return [];
    const sets = tickers.map(t => new Set(seriesByTicker[t].map(x => x.date)));
    // intersect
    let common = sets[0];
    for (let i = 1; i < sets.length; i++) {
      const next = new Set();
      for (const d of common) if (sets[i].has(d)) next.add(d);
      common = next;
      if (!common.size) break;
    }
    return [...common].sort((a, b) => a.localeCompare(b));
  };

  WV.portfolioIndexSeries = function portfolioIndexSeries(seriesByTicker, weights) {
    const dates = WV.mergeSeriesOnDates(seriesByTicker);
    if (!dates.length) return [];
    const tickers = Object.keys(seriesByTicker);
    const closeMap = {};
    tickers.forEach(t => {
      closeMap[t] = new Map(seriesByTicker[t].map(x => [x.date, x.close]));
    });

    const baseDate = dates[0];
    const base = tickers.reduce((s, t) => s + (weights[t] || 0) * (closeMap[t].get(baseDate) || 0), 0);
    if (!(base > 0)) return [];

    return dates.map(d => {
      const v = tickers.reduce((s, t) => s + (weights[t] || 0) * (closeMap[t].get(d) || 0), 0);
      return { date: d, index: (v / base) * 100 };
    });
  };

  WV.calcDrawdown = function calcDrawdown(indexSeries) {
    let peak = -Infinity;
    let maxDD = 0;
    for (const p of indexSeries) {
      const v = p.index;
      if (v > peak) peak = v;
      const dd = peak > 0 ? (v / peak) - 1 : 0;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD; // negative
  };

  WV.calcCAGR = function calcCAGR(indexSeries) {
    if (!indexSeries || indexSeries.length < 2) return null;
    const start = indexSeries[0];
    const end = indexSeries[indexSeries.length - 1];
    const years = (new Date(end.date) - new Date(start.date)) / (1000 * 60 * 60 * 24 * 365.25);
    if (!(years > 0)) return null;
    const ratio = end.index / start.index;
    if (!(ratio > 0)) return null;
    return Math.pow(ratio, 1 / years) - 1;
  };

  WV.calcVol = function calcVol(indexSeries) {
    if (!indexSeries || indexSeries.length < 3) return null;
    const rets = [];
    for (let i = 1; i < indexSeries.length; i++) {
      const a = indexSeries[i - 1].index;
      const b = indexSeries[i].index;
      if (a > 0 && b > 0) rets.push(Math.log(b / a));
    }
    if (rets.length < 2) return null;
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
    const varr = rets.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (rets.length - 1);
    const daily = Math.sqrt(varr);
    return daily * Math.sqrt(252);
  };

  WV.hhi = function hhi(weights) {
    const vals = Object.values(weights || {});
    if (!vals.length) return null;
    return vals.reduce((s, w) => s + w * w, 0);
  };

  WV.fmtPct = function fmtPct(x, digits = 1) {
    if (x === null || x === undefined || !Number.isFinite(x)) return '—';
    return (x * 100).toFixed(digits) + '%';
  };
})();
