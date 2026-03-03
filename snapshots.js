/* WealthView Snapshots / Time Machine (Roadmap #16) — Library Render + Storage Compatibility
   Fixes:
   - "Snapshot saved" but not visible in Library page.
   Causes addressed:
   1) Library rendering not firing / selector mismatch
   2) Key mismatch (writes to multiple keys for backward/forward compat)
   3) Library page may have different markup versions — we detect and render flexibly
   4) URL matching now works with both /library and /library.html paths
   5) Save Snapshot button styled inline with Visualize Portfolio button
*/

(function () {
  'use strict';

  const g = (typeof window !== 'undefined') ? window : globalThis;

  if (!g.WV || typeof g.WV !== 'object') g.WV = {};
  const WV = g.WV;
  if (!WV.Snapshots || typeof WV.Snapshots !== 'object') WV.Snapshots = {};

  // Primary storage key (new)
  const SNAP_KEY = 'wvSnapshots';
  // Compatibility keys (older/alternate)
  const COMPAT_KEYS = ['wv_snapshots', 'snapshots'];

  function safeParse(json) { try { return JSON.parse(json); } catch { return null; } }
  function nowISO() { return new Date().toISOString(); }
  function uid() { return 's_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36); }

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
    } catch { console.log('[Snapshots]', msg); }
  }

  function readAnySnapshots() {
    const primary = safeParse(localStorage.getItem(SNAP_KEY));
    if (Array.isArray(primary) && primary.length) return primary;

    for (const k of COMPAT_KEYS) {
      const v = safeParse(localStorage.getItem(k));
      if (Array.isArray(v) && v.length) return v;
    }
    return [];
  }

  function writeSnapshots(arr) {
    const json = JSON.stringify(arr || []);
    localStorage.setItem(SNAP_KEY, json);
    // keep compat mirrors so any older UI can still read
    for (const k of COMPAT_KEYS) localStorage.setItem(k, json);
  }

  function normalizeHoldings(holdings) {
    return (Array.isArray(holdings) ? holdings : []).map(h => ({
      ticker: (h.ticker || '').toString().trim().toUpperCase(),
      shares: Number(h.shares || 0),
      purchasePrice: (h.purchasePrice === null || h.purchasePrice === undefined) ? null : Number(h.purchasePrice),
      purchaseDate: h.purchaseDate || null
    })).filter(h => h.ticker && isFinite(h.shares) && h.shares > 0);
  }

  function getSavedPortfolioFromStorage() {
    const portfolios = safeParse(localStorage.getItem('portfolios'));
    const currentId = localStorage.getItem('currentPortfolio');
    if (!portfolios || typeof portfolios !== 'object') return null;

    const pid = (typeof currentId === 'string' && currentId.trim()) ? currentId.trim() : null;
    const raw = pid && portfolios[pid] ? portfolios[pid] : null;
    if (!raw) return null;

    return {
      id: pid || 'unknown',
      name: raw.name || (pid === 'default' ? 'Default Portfolio' : pid),
      holdings: Array.isArray(raw.holdings) ? raw.holdings : []
    };
  }

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
      const nums = row.querySelectorAll('input[type="number"]');
      const dateInput = row.querySelector('input[type="text"][placeholder*="DD"]') || null;

      const ticker = (tickerInput?.value || '').trim().toUpperCase();
      const shares = Number(nums?.[0]?.value || 0);
      const purchasePrice = (nums?.[1]?.value !== undefined && nums[1].value !== '')
        ? Number(nums[1].value)
        : null;
      const purchaseDate = (dateInput?.value || '').trim() || null;

      if (!ticker || !isFinite(shares) || shares <= 0) continue;
      holdings.push({ ticker, shares, purchasePrice, purchaseDate });
    }

    return { id, name, holdings };
  }

  // ---------- Public API ----------
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

    const snaps = readAnySnapshots();
    snaps.unshift(snap);
    writeSnapshots(snaps.slice(0, 100));

    toast('Snapshot saved ✅');

    // If we are on library page, update list instantly
    try { WV.Snapshots.renderLibrary(); } catch {}
  };

  WV.Snapshots.list = function list() { return readAnySnapshots(); };

  WV.Snapshots.delete = function del(snapshotId) {
    writeSnapshots(readAnySnapshots().filter(s => s.snapshotId !== snapshotId));
    toast('Snapshot deleted ✅');
    try { WV.Snapshots.renderLibrary(); } catch {}
  };

  WV.Snapshots.restoreAsNewPortfolio = function restoreAsNewPortfolio(snapshotId) {
    const snap = readAnySnapshots().find(s => s.snapshotId === snapshotId);
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

  // ---------- Library rendering ----------
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function findLibraryListContainer() {
    return (
      document.querySelector('[data-testid="snapshots-list"]') ||
      document.getElementById('snapshots-list') ||
      document.getElementById('snapshotsList') ||
      document.querySelector('[data-snapshots-list]') ||
      null
    );
  }

  function findLibraryPortfolioFilter() {
    return (
      document.querySelector('[data-testid="snapshots-portfolio-filter"]') ||
      document.getElementById('snapshots-portfolio-filter') ||
      document.getElementById('snapshotsPortfolioFilter') ||
      null
    );
  }

  function ensureLibraryScaffold() {
    // If the Library HTML changed and the container is missing, create a simple section.
    let list = findLibraryListContainer();
    if (list) return { list };

    const host =
      document.querySelector('#main-content') ||
      document.querySelector('.content') ||
      document.querySelector('main') ||
      document.body;

    const card = document.createElement('div');
    card.className = 'wv-card';
    card.style.background = '#fff';
    card.style.border = '1px solid #e7eef6';
    card.style.borderRadius = '14px';
    card.style.padding = '14px';
    card.style.marginTop = '14px';

    const h = document.createElement('h3');
    h.textContent = 'Snapshots (Time Machine)';
    h.style.margin = '0 0 10px 0';
    h.style.fontSize = '16px';

    list = document.createElement('div');
    list.id = 'snapshots-list';

    card.appendChild(h);
    card.appendChild(list);
    host.appendChild(card);

    return { list };
  }

  WV.Snapshots.renderLibrary = function renderLibrary() {
    const { list } = ensureLibraryScaffold();
    const filterEl = findLibraryPortfolioFilter();

    const snaps = readAnySnapshots();

    let filtered = snaps;
    if (filterEl && filterEl.value) {
      const v = filterEl.value;
      filtered = snaps.filter(s => (s.portfolioId === v) || (s.portfolioName === v));
    }

    list.innerHTML = '';

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No snapshots yet. Create one in Portfolio Visualizer → "Save Snapshot".';
      empty.style.opacity = '0.8';
      empty.style.fontSize = '13px';
      list.appendChild(empty);
      return;
    }

    for (const s of filtered) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.gap = '10px';
      row.style.padding = '10px';
      row.style.border = '1px solid #eef2f7';
      row.style.borderRadius = '12px';
      row.style.marginBottom = '10px';

      const left = document.createElement('div');
      const title = document.createElement('div');
      title.textContent = `${s.portfolioName || 'Portfolio'} • ${fmtDate(s.createdAt)}`;
      title.style.fontWeight = '700';
      title.style.fontSize = '13px';

      const meta = document.createElement('div');
      meta.textContent = `${(s.holdings?.length || 0)} holdings • source: ${s.meta?.source || 'unknown'}`;
      meta.style.opacity = '0.75';
      meta.style.fontSize = '12px';

      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';

      const restore = document.createElement('button');
      restore.textContent = 'Restore as new portfolio';
      restore.className = 'btn btn-primary';
      restore.style.padding = '8px 10px';
      restore.style.borderRadius = '10px';
      restore.style.border = '0';
      restore.style.cursor = 'pointer';
      restore.addEventListener('click', () => WV.Snapshots.restoreAsNewPortfolio(s.snapshotId));

      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.className = 'btn btn-secondary';
      del.style.padding = '8px 10px';
      del.style.borderRadius = '10px';
      del.style.border = '1px solid #dbe6f2';
      del.style.background = '#fff';
      del.style.cursor = 'pointer';
      del.addEventListener('click', () => WV.Snapshots.delete(s.snapshotId));

      right.appendChild(restore);
      right.appendChild(del);

      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
  };

  // ---------- Detect Library page (broader URL matching) ----------
  function isLibraryPage() {
    const path = location.pathname.toLowerCase();
    const hash = (location.hash || '').toLowerCase();
    return (
      path.includes('library') ||
      hash.includes('library') ||
      !!document.querySelector('[data-page="library"]') ||
      !!findLibraryListContainer()
    );
  }

  // ---------- Detect Visualizer page (broader URL matching) ----------
  function isVisualizerPage() {
    const path = location.pathname.toLowerCase();
    const hash = (location.hash || '').toLowerCase();
    return (
      path.includes('visualizer') ||
      hash.includes('visualizer') ||
      !!document.getElementById('holdings-container') ||
      !!document.getElementById('saveSnapshotBtn')
    );
  }

  // Auto-render on Library page
  function maybeAutoRenderLibrary() {
    if (!isLibraryPage()) return;

    try {
      WV.Snapshots.renderLibrary();
      // If a filter exists, re-render on change
      const filterEl = findLibraryPortfolioFilter();
      if (filterEl && !filterEl.__wvBound) {
        filterEl.__wvBound = true;
        filterEl.addEventListener('change', () => WV.Snapshots.renderLibrary());
      }
    } catch (e) {
      console.error('[Snapshots] Library render error:', e);
    }
  }

  // Bind Save Snapshot button on visualizer + make it inline with Visualize Portfolio
  function bindVisualizerButton() {
    if (!isVisualizerPage()) return;

    const btn =
      document.getElementById('saveSnapshotBtn') ||
      document.querySelector('[data-testid="save-snapshot"]') ||
      Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').toLowerCase().includes('save snapshot'));

    if (!btn || btn.__wvSnapshotBound) return;
    btn.__wvSnapshotBound = true;

    // Remove inline handler
    try { btn.onclick = null; } catch {}

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      WV.Snapshots.saveSnapshot();
    }, true);

    // --- Make Save Snapshot button inline with Visualize Portfolio ---
    const vizBtn =
      document.getElementById('visualizeBtn') ||
      document.querySelector('[data-testid="visualize-portfolio"]') ||
      Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').toLowerCase().includes('visualize portfolio'));

    if (vizBtn && btn) {
      // Check if they are NOT already in the same flex row
      const vizParent = vizBtn.parentElement;
      const snapParent = btn.parentElement;

      if (vizParent && vizParent !== snapParent) {
        // Create a flex wrapper row for both buttons
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '10px';
        wrapper.style.marginBottom = '10px';
        wrapper.style.width = '100%';

        // Insert wrapper where the Visualize button currently is
        vizParent.insertBefore(wrapper, vizBtn);

        // Style both buttons to share the row equally
        vizBtn.style.flex = '1';
        vizBtn.style.margin = '0';
        btn.style.flex = '1';
        btn.style.margin = '0';

        // Move both buttons into the wrapper
        wrapper.appendChild(vizBtn);
        wrapper.appendChild(btn);
      } else if (vizParent && vizParent === snapParent) {
        // Already same parent — just make sure parent is flex
        vizParent.style.display = 'flex';
        vizParent.style.gap = '10px';
        vizBtn.style.flex = '1';
        btn.style.flex = '1';
      }
    }
  }

  // --- Init with retry (handles late-loading SPAs / dynamic content) ---
  function init() {
    bindVisualizerButton();
    maybeAutoRenderLibrary();
  }

  function initWithRetry() {
    init();
    // Retry a few times for SPAs where DOM may populate after initial load
    let retries = 0;
    const maxRetries = 5;
    const interval = setInterval(() => {
      retries++;
      init();
      if (retries >= maxRetries) clearInterval(interval);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWithRetry, { once: true });
  } else {
    initWithRetry();
  }

  // Also listen for SPA-style navigation changes
  window.addEventListener('hashchange', init);
  window.addEventListener('popstate', init);

})();
