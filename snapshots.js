/* WealthView Snapshots / Time Machine (Roadmap #16) — Robust Loader Patch
   Fixes cases where:
   - snapshots.js loads (200) but inline onclick runs before WV is ready
   - visualizer.html has an inline onclick guard that shows "module not loaded"
   This file:
   1) Ensures window.WV exists (even if previously overwritten)
   2) Defines WV.Snapshots API
   3) On DOMContentLoaded, force-binds the Save Snapshot button click to WV.Snapshots.saveSnapshot
      and removes any inline onclick handler that might throw.
*/

(function () {
  'use strict';

  const g = (typeof window !== 'undefined') ? window : globalThis;

  // Ensure a sane global WV container (overwrite invalid types safely)
  if (!g.WV || typeof g.WV !== 'object') g.WV = {};
  const WV = g.WV;
  if (!WV.Snapshots || typeof WV.Snapshots !== 'object') WV.Snapshots = {};

  const SNAP_KEY = 'wvSnapshots';

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }
  function nowISO() { return new Date().toISOString(); }

  function toast(msg, type) {
    if (typeof g.showToast === 'function') return g.showToast(msg, type);

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

  // Read saved portfolio (if user pressed Save in manager)
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

  // Read portfolio from current Visualizer UI
  function getPortfolioFromUI() {
    const select = document.getElementById('portfolio-selector');
    const name = select ? (select.options[select.selectedIndex]?.textContent || 'Current Portfolio') : 'Current Portfolio';
    const id = select ? (select.value || 'current') : 'current';

    const container = document.getElementById('holdings-container');
    const holdings = [];

    if (!container) return { id, name, holdings };

    const rows = Array.from(container.querySelectorAll('.holding-input'));
    for (const row of rows) {
      const tickerInput = row.querySelector('input[type="text"]');
      const numInputs = row.querySelectorAll('input[type="number"]');
      const dateInput = row.querySelector('input[type="text"][placeholder*="DD"]') || null;

      // In your UI: [ticker text] [shares number] [cost basis number] [date text]
      const ticker = (tickerInput?.value || '').trim().toUpperCase();
      const shares = Number(numInputs?.[0]?.value || 0);
      const purchasePrice = (numInputs?.[1]?.value !== undefined && numInputs?.[1]?.value !== '')
        ? Number(numInputs[1].value)
        : null;
      const purchaseDate = (dateInput?.value || '').trim() || null;

      if (!ticker || !isFinite(shares) || shares <= 0) continue;

      holdings.push({ ticker, shares, purchasePrice, purchaseDate });
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

  WV.Snapshots.saveSnapshot = function saveSnapshot() {
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
      meta: { source: (chosen === saved) ? 'storage' : 'ui' }
    };

    const snaps = getSnapshots();
    snaps.unshift(snap);
    setSnapshots(snaps.slice(0, 100));
    toast('Snapshot saved ✅');
  };

  WV.Snapshots.list = function list() { return getSnapshots(); };

  WV.Snapshots.delete = function del(snapshotId) {
    setSnapshots(getSnapshots().filter(s => s.snapshotId !== snapshotId));
    toast('Snapshot deleted ✅');
  };

  WV.Snapshots.restoreAsNewPortfolio = function restoreAsNewPortfolio(snapshotId) {
    const snap = getSnapshots().find(s => s.snapshotId === snapshotId);
    if (!snap) { toast('Snapshot not found', 'error'); return; }

    const portfolios = safeParse(localStorage.getItem('portfolios')) || {};
    const newId = 'snap_' + Date.now().toString(36);
    const label = (snap.portfolioName || 'Snapshot') + ' — ' + new Date(snap.createdAt).toLocaleString();

    portfolios[newId] = { name: label, holdings: snap.holdings };
    localStorage.setItem('portfolios', JSON.stringify(portfolios));
    localStorage.setItem('currentPortfolio', newId);

    toast('Snapshot restored ✅');
    location.href = 'visualizer.html';
  };

  // Mark ready
  g.__WV_SNAPSHOTS_READY__ = true;

  // Force-bind the Save Snapshot button to avoid inline handler issues
  function bindButton() {
    const candidates = [
      document.getElementById('saveSnapshotBtn'),
      document.querySelector('[data-testid="save-snapshot"]'),
      ...Array.from(document.querySelectorAll('button'))
        .filter(b => (b.textContent || '').toLowerCase().includes('save snapshot'))
    ].filter(Boolean);

    const btn = candidates[0];
    if (!btn) return;

    // Remove inline onclick that may show the "module not loaded" alert
    try { btn.onclick = null; } catch {}
    // Avoid multiple bindings
    if (btn.__wvSnapshotBound) return;
    btn.__wvSnapshotBound = true;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        WV.Snapshots.saveSnapshot();
      } catch (err) {
        console.error(err);
        toast('Snapshots failed to save (see console).', 'error');
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButton, { once: true });
  } else {
    bindButton();
  }
})();
