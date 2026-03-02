/* WealthView Unified Engine (Health + Backtest + Library compatibility)
   - Reads the same localStorage keys used by Visualizer:
       localStorage['portfolios'] (object) and localStorage['currentPortfolio'] (string)
   - Supports multiple portfolio storage shapes (legacy + new).
   - Provides WV.* helpers used by health.html and backtest.html
*/
(function () {
  'use strict';

  const g = (typeof window !== 'undefined') ? window : globalThis;
  g.WV = g.WV || {};
  const WV = g.WV;

  // ---------------------------
  // Storage helpers
  // ---------------------------
  function safeParse(json) {
    try { return JSON.parse(json); } catch (e) { return null; }
  }

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  // Normalize one portfolio into { id, name, holdings: [{ticker, shares, purchasePrice?, purchaseDate?}] }
  function normalizePortfolio(id, rawVal) {
    // Shape A: { name, holdings: [ {ticker, shares, ...}, ... ] }
    if (isObj(rawVal) && Array.isArray(rawVal.holdings)) {
      return {
        id,
        name: (typeof rawVal.name === 'string' && rawVal.name.trim()) ? rawVal.name.trim() : id,
        holdings: rawVal.holdings.map(h => ({
          ticker: (h.ticker || '').toString().trim().toUpperCase(),
          shares: Number(h.shares ?? h.quantity ?? 0),
          purchasePrice: (h.purchasePrice != null ? Number(h.purchasePrice) : null),
          purchaseDate: (h.purchaseDate != null ? String(h.purchaseDate) : null)
        })).filter(h => h.ticker && isFinite(h.shares) && h.shares > 0)
      };
    }

    // Shape B: holdings array directly (key is name)
    if (Array.isArray(rawVal)) {
      return {
        id,
        name: id,
        holdings: rawVal.map(h => ({
          ticker: (h.ticker || '').toString().trim().toUpperCase(),
          shares: Number(h.shares ?? h.quantity ?? 0),
          purchasePrice: (h.purchasePrice != null ? Number(h.purchasePrice) : null),
          purchaseDate: (h.purchaseDate != null ? String(h.purchaseDate) : null)
        })).filter(h => h.ticker && isFinite(h.shares) && h.shares > 0)
      };
    }

    // Shape C: { holdings: { TICKER: {shares} } } or { TICKER: shares }
    if (isObj(rawVal)) {
      let holdingsObj = null;
      if (isObj(rawVal.holdings)) holdingsObj = rawVal.holdings;
      else holdingsObj = rawVal;

      const holdings = [];
      for (const [k, v] of Object.entries(holdingsObj || {})) {
        if (!k) continue;
        if (isObj(v)) {
          const shares = Number(v.shares ?? v.quantity ?? v.qty ?? 0);
          const ticker = (v.ticker || k).toString().trim().toUpperCase();
          if (ticker && isFinite(shares) && shares > 0) holdings.push({ ticker, shares, purchasePrice: null, purchaseDate: null });
        } else {
          const shares = Number(v);
          const ticker = k.toString().trim().toUpperCase();
          if (ticker && isFinite(shares) && shares > 0) holdings.push({ ticker, shares, purchasePrice: null, purchaseDate: null });
        }
      }
      return {
        id,
        name: (typeof rawVal.name === 'string' && rawVal.name.trim()) ? rawVal.name.trim() : id,
        holdings
      };
    }

    return { id, name: id, holdings: [] };
  }

  // Public: returns { map, list }
  WV.getPortfolios = function getPortfolios() {
    const raw = safeParse(localStorage.getItem('portfolios') || '{}') || {};
    const map = {};
    const list = [];

    if (isObj(raw)) {
      for (const [id, val] of Object.entries(raw)) {
        const p = normalizePortfolio(id, val);
        map[id] = p;
        list.push(p);
      }
    } else if (Array.isArray(raw)) {
      raw.forEach((val, idx) => {
        const id = val?.id || val?.name || `portfolio_${idx+1}`;
        const p = normalizePortfolio(id, val);
        map[id] = p;
        list.push(p);
      });
    }

    if (list.length === 0) {
      const p = { id: 'default', name: 'default', holdings: [] };
      map[p.id] = p;
      list.push(p);
    }

    // Backward compatibility: many pages expect WV.getPortfolios() to be a plain object map.
    // We also attach a non-enumerable list for convenience.
    Object.defineProperty(map, '_list', { value: list, enumerable: false });
    return map;
  };

  WV.getPortfoliosList = function getPortfoliosList() {
    const m = WV.getPortfolios();
    return m._list || Object.values(m);
  };

  WV.listPortfolioNames = function listPortfolioNames() {
    const list = WV.getPortfoliosList();
    return list.map(p => ({ id: p.id, name: p.name }));
  };

  WV.getCurrentPortfolioId = function getCurrentPortfolioId() {
    const cur = localStorage.getItem('currentPortfolio');
    const map = WV.getPortfolios();
    const list = WV.getPortfoliosList();

    if (cur && map[cur]) return cur;
    if (cur) {
      const match = list.find(p => p.name === cur);
      if (match) return match.id;
    }
    return list[0]?.id || 'default';
  };

  WV.setCurrentPortfolioId = function setCurrentPortfolioId(id) {
    localStorage.setItem('currentPortfolio', id);
  };

  WV.populatePortfolioSelect = function populatePortfolioSelect(selectEl, opts = {}) {
    const { selectedId } = opts;
    const list = WV.getPortfoliosList();

    const desired = selectedId || WV.getCurrentPortfolioId();
    selectEl.innerHTML = '';
    for (const p of list) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === desired) opt.selected = true;
      selectEl.appendChild(opt);
    }
    return selectEl.value;
  };

  // ---------------------------
  // Market data
  // ---------------------------
  function fmtDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  WV.fetchHistory = async function fetchHistory(ticker, fromDate, toDate) {
    const from = (typeof fromDate === 'string') ? fromDate : fmtDate(fromDate);
    const to = (typeof toDate === 'string') ? toDate : fmtDate(toDate);
    const url = `/api/historical?symbol=${encodeURIComponent(ticker)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Historical API failed (${res.status}). ${txt || ''}`.trim());
    }
    const data = await res.json();
    // Expect: [{date:'YYYY-MM-DD', close: number}, ...]
    if (!Array.isArray(data)) throw new Error('Unexpected historical response.');
    return data
      .map(r => ({ date: r.date, close: Number(r.close ?? r.c ?? r.price ?? r.value) }))
      .filter(r => r.date && isFinite(r.close));
  };

  // ---------------------------
  // Portfolio math
  // ---------------------------
  WV.alignSeries = function alignSeries(seriesByTicker) {
    // seriesByTicker: { TICKER: [{date,close}, ...], ... }
    const tickers = Object.keys(seriesByTicker);
    if (tickers.length === 0) return { dates: [], matrix: {} };

    // build date -> close maps
    const maps = {};
    tickers.forEach(t => {
      const m = new Map();
      seriesByTicker[t].forEach(r => m.set(r.date, r.close));
      maps[t] = m;
    });

    // intersect dates
    let common = null;
    tickers.forEach(t => {
      const dates = new Set(seriesByTicker[t].map(r => r.date));
      if (common === null) common = dates;
      else common = new Set([...common].filter(d => dates.has(d)));
    });
    const dates = Array.from(common || []).sort();

    const matrix = {};
    tickers.forEach(t => {
      matrix[t] = dates.map(d => maps[t].get(d));
    });

    return { dates, matrix, closes: matrix };
  };

  WV.getWeights = function getWeights(a, b) {
    // Backward-compatible:
    // - getWeights(holdingsArray, firstPricesObj) -> weightsMap
    // - getWeights(portfolioObject, topNNumber) -> [{ticker, weight}, ...]
    if (Array.isArray(a) && isObj(b)) {
      const holdings = a;
      const firstPrices = b;
      const values = holdings.map(h => (Number(h.shares) || 0) * (firstPrices[h.ticker] || 0));
      const total = values.reduce((x,y)=>x+y,0);
      const weights = {};
      holdings.forEach((h, i) => { weights[h.ticker] = total > 0 ? (values[i]/total) : (1/holdings.length); });
      return weights;
    }

    // Portfolio object case
    const p = (isObj(a) ? a : {});
    const topN = (typeof b === 'number' && isFinite(b) && b > 0) ? b : null;
    const holdings = Array.isArray(p.holdings) ? p.holdings : (Array.isArray(p) ? p : []);
    const totalShares = holdings.reduce((x,h)=>x + (Number(h.shares)||0), 0);
    const arr = holdings
      .map(h => ({ ticker: h.ticker, weight: totalShares > 0 ? ((Number(h.shares)||0)/totalShares) : (1/holdings.length) }))
      .filter(x => x.ticker && isFinite(x.weight) && x.weight > 0)
      .sort((x,y)=>y.weight-x.weight);
    return topN ? arr.slice(0, topN) : arr;
  };

  WV.toReturns = function toReturns(values) {
    const rets = [];
    for (let i=1;i<values.length;i++){
      const prev = values[i-1];
      const cur = values[i];
      rets.push(prev > 0 ? (cur/prev - 1) : 0);
    }
    return rets;
  };

  WV.volatility = function volatility(dailyReturns) {
    if (!dailyReturns.length) return 0;
    const mean = dailyReturns.reduce((a,b)=>a+b,0)/dailyReturns.length;
    const varr = dailyReturns.reduce((a,b)=>a+(b-mean)*(b-mean),0)/dailyReturns.length;
    const dailyVol = Math.sqrt(varr);
    return dailyVol * Math.sqrt(252);
  };

  WV.maxDrawdown = function maxDrawdown(values) {
    let peak = -Infinity;
    let mdd = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      if (peak > 0) {
        const dd = (v/peak) - 1;
        if (dd < mdd) mdd = dd;
      }
    }
    return mdd; // negative
  };

  WV.cagr = function cagr(values, startDate, endDate) {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const start = values[0];
    const end = values[values.length - 1];
    if (!(start > 0) || !(end > 0)) return 0;

    // If dates provided, use them
    if (startDate && endDate) {
      const ms = (new Date(endDate).getTime() - new Date(startDate).getTime());
      const years = ms / (365.25 * 24 * 3600 * 1000);
      if (years <= 0) return 0;
      return Math.pow(end/start, 1/years) - 1;
    }

    // Otherwise approximate using trading days (252/year)
    const yearsApprox = (values.length - 1) / 252;
    if (yearsApprox <= 0) return 0;
    return Math.pow(end/start, 1/yearsApprox) - 1;
  };

  WV.hhi = function hhi(weights) {
    const vals = Object.values(weights || {});
    return vals.reduce((a,w)=>a + w*w, 0);
  };

  // Build portfolio value series from aligned closes + holdings
  WV.buildPortfolioSeries = function buildPortfolioSeries(dates, matrix, holdings) {
    const tickers = holdings.map(h => h.ticker);
    if (!dates.length || !tickers.length) return { dates: [], values: [] };

    // first prices
    const firstPrices = {};
    tickers.forEach(t => { firstPrices[t] = (matrix[t] && matrix[t][0]) || 0; });

    const weights = WV.getWeights(holdings, firstPrices);

    // Use weights with normalized index: sum(weights * (price_t/price_0))
    const values = dates.map((_, i) => {
      let v = 0;
      tickers.forEach(t => {
        const p0 = firstPrices[t] || 0;
        const pi = (matrix[t] && matrix[t][i]) || 0;
        if (p0 > 0) v += (weights[t] || 0) * (pi / p0);
      });
      return v;
    });

    return { dates, values, weights };
  };

})();