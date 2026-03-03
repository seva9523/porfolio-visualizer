/* WealthView Snapshots / Time Machine (Roadmap #16)
   - Stores snapshots in localStorage (key: 'wvSnapshots')
   - Works even if the user hasn't pressed "Save" on the portfolio:
       it can snapshot directly from the Visualizer UI inputs.
*/

(function () {
  'use strict';

  const g = (typeof window !== 'undefined') ? window : globalThis;
  g.WV = g.WV || {};
  const WV = g.WV;
  WV.Snapshots = WV.Snapshots || {};

  const SNAP_KEY = 'wvSnapshots';

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }
  function nowISO() { return new Date().toISOString(); }

  function toast(msg, type) {
    // If your site has a global toast, use it; else fallback to alert-like
    if (typeof g.showToast === 'function') return g.showToast(msg, type);
    // lightweight inline toast
    try {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.bottom = '24px';
      el.style.transform = 'translateX(-50%)';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.fontWeight = '700';
      el.style.fontSize = '13px';
      el.style.zIndex = '99999';
      el.style.color = '#fff';
      el.style.boxShadow = '0 10px 30px rgba(0,0,0,.15)';
      el.style.background = (type === 'error') ? '#e74c3c' : '#16a085';
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1600);
      setTimeout(() => { el.remove(); }, 2100);
    } catch {
      // last resort
      console.log('[Snapshots]', msg);
    }
  }

  function getSnapshots() {
    const arr = safeParse(localStorage.getItem(SNAP_KEY));
    return Array.isArray(arr) ? arr : [];
  }

  function setSnapshots(arr) {
    localStorage.setItem(SNAP_KEY, JSON.stringify(arr || []));
  }

  function uid() {
    return 's_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
  }

  // ---------- Read current portfolio from storage (if saved) ----------
  function getSavedPortfolioFromStorage() {
    const portfolios = safeParse(localStorage.getItem('portfolios'));
    const currentId = localStorage.getItem('currentPortfolio');

    if (!portfolios || typeof portfolios !== 'object') return null;

    const pid = (typeof currentId === 'string' && currentId.trim()) ? currentId.trim() : null;
    const raw = pid && portfolios[pid] ? portfolios[pid] : null;

    if (!raw) return null;

    const name = raw.name || (pid === 'default' ? 'Default Portfolio' : pid);
    const holdings = Array.isArray(raw.holdings) ? raw.holdings : [];
    return { id: pid || 'unknown', name, holdings };
  }

  // ---------- Read portfolio from UI (works even if not saved) ----------
  function getPortfolioFromUI() {
    const select = document.getElementById('portfolio-selector');
    const name = select ? (select.options[select.selectedIndex]?.textContent || 'Current Portfolio') : 'Current Portfolio';
    const id = select ? (select.value || 'current') : 'current';

    const container = document.getElementById('holdings-container');
    const holdings = [];

    if (!container) return { id, name, holdings };

    // Each holding row contains: ticker input (text), shares (number), purchase (number), date (text)
    const rows = Array.from(container.querySelectorAll('.holding-input'));
    for (const row of rows) {
      const tickerInput = row.querySelector('input[type="text"][placeholder="Ticker"]') || row.querySelector('input[type="text"]');
      const sharesInput = row.querySelector('input[type="number"][placeholder="Shares"]') || row.querySelector('input[id^="shares-"]');
      const purchaseInput = row.querySelector('input[type="number"][placeholder="Cost Basis"]') || row.querySelector('input[id^="purchase-"]');
      const dateInput = row.querySelector('input[type="text"][placeholder="DD/MM/YYYY"]') || row.querySelector('input[id^="date-"]');

      const ticker = (tickerInput?.value || '').trim().toUpperCase();
      const shares = Number(sharesInput?.value || 0);
      const purchasePrice = purchaseInput?.value !== undefined && purchaseInput?.value !== '' ? Number(purchaseInput.value) : null;
      const purchaseDate = (dateInput?.value || '').trim() || null;

      if (!ticker || !isFinite(shares) || shares <= 0) continue;

      holdings.push({
        ticker,
        shares,
        purchasePrice,
        purchaseDate
      });
    }

    return { id, name, holdings };
  }

  function normalizeHoldings(holdings) {
    return (Array.isArray(holdings) ? holdings : []).map(h => ({
      ticker: (h.ticker || '').toString().trim().toUpperCase(),
      shares: Number(h.shares || 0),
      purchasePrice: (h.purchasePrice === null || h.purchasePrice === undefined) ? null : Number(h.purchasePrice),
      purchaseDate: h.purchaseDate || null
    })).filter(h => h.ticker && isFinite(h.shares) && h.shares > 0);
  }

  // ---------- Public API ----------
  WV.Snapshots.saveSnapshot = function saveSnapshot() {
    // Prefer storage if available; fallback to UI.
    const saved = getSavedPortfolioFromStorage();
    const ui = getPortfolioFromUI();

    const chosen = (saved && saved.holdings && saved.holdings.length) ? saved : ui;

    const holdings = normalizeHoldings(chosen.holdings);
    if (!holdings.length) {
      toast('No holdings to snapshot. Add holdings first.', 'error');
      return;
    }

    const snap = {
      snapshotId: uid(),
      createdAt: nowISO(),
      portfolioId: chosen.id || 'current',
      portfolioName: chosen.name || 'Current Portfolio',
      holdings,
      meta: {
        source: (chosen === saved) ? 'storage' : 'ui'
      }
    };

    const snaps = getSnapshots();
    snaps.unshift(snap);
    // keep last 100 snapshots
    setSnapshots(snaps.slice(0, 100));
    toast('Snapshot saved ✅');
  };

  WV.Snapshots.list = function list() {
    return getSnapshots();
  };

  WV.Snapshots.delete = function del(snapshotId) {
    const snaps = getSnapshots().filter(s => s.snapshotId !== snapshotId);
    setSnapshots(snaps);
    toast('Snapshot deleted ✅');
  };

  WV.Snapshots.restoreAsNewPortfolio = function restoreAsNewPortfolio(snapshotId) {
    const snap = getSnapshots().find(s => s.snapshotId === snapshotId);
    if (!snap) { toast('Snapshot not found', 'error'); return; }

    const portfolios = safeParse(localStorage.getItem('portfolios')) || {};
    // Make a new id
    const newId = 'snap_' + Date.now().toString(36);
    const label = (snap.portfolioName || 'Snapshot') + ' — ' + new Date(snap.createdAt).toLocaleString();

    portfolios[newId] = {
      name: label,
      holdings: snap.holdings.map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        purchasePrice: h.purchasePrice ?? undefined,
        purchaseDate: h.purchaseDate ?? undefined
      }))
    };

    localStorage.setItem('portfolios', JSON.stringify(portfolios));
    localStorage.setItem('currentPortfolio', newId);

    toast('Snapshot restored ✅');
    // Navigate to visualizer
    try {
      const base = location.origin + location.pathname.replace(/\/[^\/]*$/, '/');
      location.href = base + 'visualizer.html';
    } catch {
      location.href = 'visualizer.html';
    }
  };

})();
