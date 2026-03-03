/* WealthView Snapshots / Time Machine (Roadmap #16) — Library Render + Storage Compatibility
   Fixes:
   - "Snapshot saved" but not visible in Library page.
   - Button calls saveCurrent() but JS only defined saveSnapshot() — added alias.
   - Library page URL detection now matches library.html paths.
   - Save Snapshot button now styled inline with Visualize Portfolio via CSS injection.
   - No aggressive DOM scaffold injection (prevents sidebar breakage).
   - Compare two snapshots: shows what changed, drifted, added/removed.
*/

(function () {
  'use strict';

  var g = (typeof window !== 'undefined') ? window : globalThis;

  if (!g.WV || typeof g.WV !== 'object') g.WV = {};
  var WV = g.WV;
  if (!WV.Snapshots || typeof WV.Snapshots !== 'object') WV.Snapshots = {};

  var SNAP_KEY = 'wvSnapshots';
  var COMPAT_KEYS = ['wv_snapshots', 'snapshots'];

  function safeParse(json) { try { return JSON.parse(json); } catch(e) { return null; } }
  function nowISO() { return new Date().toISOString(); }
  function uid() { return 's_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36); }

  function toast(msg, type) {
    if (typeof g.showToast === 'function') return g.showToast(msg, type);
    try {
      var el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;z-index:99999;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.15);background:' + ((type === 'error') ? '#e74c3c' : '#16a085');
      document.body.appendChild(el);
      setTimeout(function(){ el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1600);
      setTimeout(function(){ el.remove(); }, 2100);
    } catch(e) { console.log('[Snapshots]', msg); }
  }

  function readAnySnapshots() {
    var primary = safeParse(localStorage.getItem(SNAP_KEY));
    if (Array.isArray(primary) && primary.length) return primary;
    for (var i = 0; i < COMPAT_KEYS.length; i++) {
      var v = safeParse(localStorage.getItem(COMPAT_KEYS[i]));
      if (Array.isArray(v) && v.length) return v;
    }
    return [];
  }

  function writeSnapshots(arr) {
    var json = JSON.stringify(arr || []);
    localStorage.setItem(SNAP_KEY, json);
    for (var i = 0; i < COMPAT_KEYS.length; i++) localStorage.setItem(COMPAT_KEYS[i], json);
  }

  function normalizeHoldings(holdings) {
    return (Array.isArray(holdings) ? holdings : []).map(function(h) {
      return {
        ticker: (h.ticker || '').toString().trim().toUpperCase(),
        shares: Number(h.shares || 0),
        purchasePrice: (h.purchasePrice === null || h.purchasePrice === undefined) ? null : Number(h.purchasePrice),
        purchaseDate: h.purchaseDate || null
      };
    }).filter(function(h) { return h.ticker && isFinite(h.shares) && h.shares > 0; });
  }

  function getSavedPortfolioFromStorage() {
    var portfolios = safeParse(localStorage.getItem('portfolios'));
    var currentId = localStorage.getItem('currentPortfolio');
    if (!portfolios || typeof portfolios !== 'object') return null;
    var pid = (typeof currentId === 'string' && currentId.trim()) ? currentId.trim() : null;
    var raw = pid && portfolios[pid] ? portfolios[pid] : null;
    if (!raw) return null;
    return {
      id: pid || 'unknown',
      name: raw.name || (pid === 'default' ? 'Default Portfolio' : pid),
      holdings: Array.isArray(raw.holdings) ? raw.holdings : []
    };
  }

  function getPortfolioFromUI() {
    var select = document.getElementById('portfolio-selector');
    var name = select ? (select.options[select.selectedIndex] ? select.options[select.selectedIndex].textContent : 'Current Portfolio') : 'Current Portfolio';
    var id = select ? (select.value || 'current') : 'current';
    var container = document.getElementById('holdings-container');
    var holdings = [];
    if (!container) return { id: id, name: name, holdings: holdings };

    var rows = Array.from(container.querySelectorAll('.holding-input'));
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var tickerInput = row.querySelector('input[type="text"]');
      var nums = row.querySelectorAll('input[type="number"]');
      var ticker = (tickerInput ? tickerInput.value : '').trim().toUpperCase();
      var shares = Number(nums[0] ? nums[0].value : 0);
      var purchasePrice = (nums[1] && nums[1].value !== '') ? Number(nums[1].value) : null;
      if (!ticker || !isFinite(shares) || shares <= 0) continue;
      holdings.push({ ticker: ticker, shares: shares, purchasePrice: purchasePrice, purchaseDate: null });
    }
    return { id: id, name: name, holdings: holdings };
  }

  // ── Public API ──
  function doSaveSnapshot() {
    var saved = getSavedPortfolioFromStorage();
    var ui = getPortfolioFromUI();
    var chosen = (saved && saved.holdings && saved.holdings.length) ? saved : ui;
    var holdings = normalizeHoldings(chosen.holdings);
    if (!holdings.length) {
      toast('No holdings to snapshot. Add holdings first.', 'error');
      return;
    }
    var snap = {
      snapshotId: uid(),
      createdAt: nowISO(),
      portfolioId: chosen.id || 'current',
      portfolioName: chosen.name || 'Current Portfolio',
      holdings: holdings,
      meta: { source: (chosen === saved) ? 'storage' : 'ui' }
    };
    var snaps = readAnySnapshots();
    snaps.unshift(snap);
    writeSnapshots(snaps.slice(0, 100));
    toast('Snapshot saved!');
    try { WV.Snapshots.renderLibrary(); } catch(e) {}
  }

  // BOTH names so the HTML onclick="...saveCurrent()" AND the old JS "saveSnapshot()" both work
  WV.Snapshots.saveSnapshot = doSaveSnapshot;
  WV.Snapshots.saveCurrent  = doSaveSnapshot;

  WV.Snapshots.list = function() { return readAnySnapshots(); };

  WV.Snapshots.delete = function(snapshotId) {
    writeSnapshots(readAnySnapshots().filter(function(s) { return s.snapshotId !== snapshotId; }));
    toast('Snapshot deleted');
    try { WV.Snapshots.renderLibrary(); } catch(e) {}
  };

  WV.Snapshots.restoreAsNewPortfolio = function(snapshotId) {
    var snap = readAnySnapshots().find(function(s) { return s.snapshotId === snapshotId; });
    if (!snap) { toast('Snapshot not found', 'error'); return; }
    var portfolios = safeParse(localStorage.getItem('portfolios')) || {};
    var newId = 'snap_' + Date.now().toString(36);
    var label = (snap.portfolioName || 'Snapshot') + ' - ' + new Date(snap.createdAt).toLocaleString();
    portfolios[newId] = { name: label, holdings: snap.holdings };
    localStorage.setItem('portfolios', JSON.stringify(portfolios));
    localStorage.setItem('currentPortfolio', newId);
    toast('Snapshot restored!');
    location.href = 'visualizer.html';
  };

  // ── Compare two snapshots (Roadmap #16: Time Machine) ──
  WV.Snapshots.compare = function(idA, idB) {
    var snaps = readAnySnapshots();
    var a = snaps.find(function(s){ return s.snapshotId === idA; });
    var b = snaps.find(function(s){ return s.snapshotId === idB; });
    if (!a || !b) return null;
    var mapA = {}, mapB = {};
    (a.holdings || []).forEach(function(h){ mapA[h.ticker] = h; });
    (b.holdings || []).forEach(function(h){ mapB[h.ticker] = h; });
    var allTickers = Object.keys(mapA).concat(Object.keys(mapB));
    allTickers = allTickers.filter(function(v,i,arr){ return arr.indexOf(v) === i; });
    var added = [], removed = [], changed = [];
    allTickers.forEach(function(t) {
      var inA = mapA[t], inB = mapB[t];
      if (inA && !inB) removed.push({ ticker: t, shares: inA.shares });
      else if (!inA && inB) added.push({ ticker: t, shares: inB.shares });
      else if (inA && inB && inA.shares !== inB.shares) {
        changed.push({ ticker: t, sharesBefore: inA.shares, sharesAfter: inB.shares, diff: inB.shares - inA.shares });
      }
    });
    var totalA = (a.holdings||[]).reduce(function(s,h){return s+h.shares;},0);
    var totalB = (b.holdings||[]).reduce(function(s,h){return s+h.shares;},0);
    var topA = (a.holdings||[]).reduce(function(mx,h){return h.shares>mx.shares?h:mx;},{ticker:'',shares:0});
    var topB = (b.holdings||[]).reduce(function(mx,h){return h.shares>mx.shares?h:mx;},{ticker:'',shares:0});
    return {
      snapshotA: { id: idA, date: a.createdAt, name: a.portfolioName, holdingsCount: (a.holdings||[]).length },
      snapshotB: { id: idB, date: b.createdAt, name: b.portfolioName, holdingsCount: (b.holdings||[]).length },
      added: added, removed: removed, changed: changed,
      concentrationA: { ticker: topA.ticker, pct: totalA ? ((topA.shares/totalA)*100).toFixed(1) : '0' },
      concentrationB: { ticker: topB.ticker, pct: totalB ? ((topB.shares/totalB)*100).toFixed(1) : '0' }
    };
  };

  // ── Library rendering ──
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString(); } catch(e) { return iso; }
  }

  function findLibraryListContainer() {
    return document.querySelector('[data-testid="snapshots-list"]')
        || document.getElementById('snapshots-list')
        || document.getElementById('snapshotsList')
        || document.querySelector('[data-snapshots-list]')
        || null;
  }

  function findLibraryPortfolioFilter() {
    return document.querySelector('[data-testid="snapshots-portfolio-filter"]')
        || document.getElementById('snapshots-portfolio-filter')
        || document.getElementById('snapshotsPortfolioFilter')
        || null;
  }

  function ensureLibraryScaffold() {
    var list = findLibraryListContainer();
    if (list) return { list: list };

    // ONLY inject into the visualization-section (middle column) — NEVER sidebar, nav, or body
    var host = document.querySelector('.visualization-section');
    if (!host) {
      console.warn('[Snapshots] No .visualization-section found — skipping scaffold.');
      return { list: null };
    }

    var card = document.createElement('div');
    card.className = 'wv-card';
    card.style.cssText = 'background:var(--card-bg,#fff);border:1px solid var(--border-color,#e7eef6);border-radius:14px;padding:20px;margin-bottom:20px;';

    var h = document.createElement('h3');
    h.textContent = 'Snapshots (Time Machine)';
    h.style.cssText = 'margin:0 0 14px 0;font-size:16px;color:var(--text-primary);';

    list = document.createElement('div');
    list.id = 'snapshots-list';

    card.appendChild(h);
    card.appendChild(list);
    host.prepend(card);

    return { list: list };
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function renderCompareResult(container, result) {
    container.innerHTML = '';
    if (!result) { container.textContent = 'Could not compare.'; return; }
    var wrap = document.createElement('div');
    wrap.style.cssText = 'padding:12px;background:var(--card-bg,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:10px;font-size:13px;color:var(--text-primary);line-height:1.7;';
    var lines = [];
    lines.push('<strong>Comparing:</strong> ' + escHtml(result.snapshotA.name) + ' (' + fmtDate(result.snapshotA.date) + ') vs ' + escHtml(result.snapshotB.name) + ' (' + fmtDate(result.snapshotB.date) + ')');
    if (result.added.length) lines.push('<span style="color:#16a085"><strong>Added:</strong> ' + result.added.map(function(a){return a.ticker+' ('+a.shares+' shares)';}).join(', ') + '</span>');
    if (result.removed.length) lines.push('<span style="color:#e74c3c"><strong>Removed:</strong> ' + result.removed.map(function(r){return r.ticker+' ('+r.shares+' shares)';}).join(', ') + '</span>');
    if (result.changed.length) lines.push('<strong>Changed:</strong> ' + result.changed.map(function(c){return c.ticker+' '+c.sharesBefore+' &rarr; '+c.sharesAfter+' ('+(c.diff>0?'+':'')+c.diff+')';}).join(', '));
    if (!result.added.length && !result.removed.length && !result.changed.length) lines.push('&#10004; No differences — both snapshots are identical.');
    lines.push('<strong>Top holding:</strong> ' + result.concentrationA.ticker + ' ' + result.concentrationA.pct + '% &rarr; ' + result.concentrationB.ticker + ' ' + result.concentrationB.pct + '%');
    wrap.innerHTML = lines.join('<br>');
    container.appendChild(wrap);
  }

  WV.Snapshots.renderLibrary = function() {
    var scaff = ensureLibraryScaffold();
    var list = scaff.list;
    if (!list) return;

    var filterEl = findLibraryPortfolioFilter();
    var snaps = readAnySnapshots();
    var filtered = snaps;
    if (filterEl && filterEl.value) {
      var v = filterEl.value;
      filtered = snaps.filter(function(s){ return s.portfolioId === v || s.portfolioName === v; });
    }

    list.innerHTML = '';

    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.textContent = 'No snapshots yet. Create one in Portfolio Visualizer > Save Snapshot.';
      empty.style.cssText = 'opacity:0.7;font-size:13px;padding:10px 0;';
      list.appendChild(empty);
      return;
    }

    // Compare UI
    if (filtered.length >= 2) {
      var compareBar = document.createElement('div');
      compareBar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding:12px;background:var(--input-bg,#f1f5f9);border-radius:10px;';
      var label = document.createElement('span');
      label.textContent = 'Compare:';
      label.style.cssText = 'font-size:12px;font-weight:700;color:var(--text-secondary);';
      var selA = document.createElement('select');
      var selB = document.createElement('select');
      var selStyle = 'padding:6px 8px;border-radius:8px;border:1.5px solid var(--input-border,#cbd5e1);font-size:12px;background:var(--chart-bg,#fff);color:var(--text-primary);max-width:220px;';
      selA.style.cssText = selStyle;
      selB.style.cssText = selStyle;
      filtered.forEach(function(s, i) {
        var txt = (s.portfolioName || 'Portfolio') + ' - ' + fmtDate(s.createdAt);
        selA.appendChild(new Option(txt, s.snapshotId));
        selB.appendChild(new Option(txt, s.snapshotId));
        if (i === 0) selA.value = s.snapshotId;
        if (i === 1) selB.value = s.snapshotId;
      });
      var cmpBtn = document.createElement('button');
      cmpBtn.textContent = 'Compare';
      cmpBtn.style.cssText = 'padding:6px 14px;border-radius:8px;border:0;background:#2E86AB;color:#fff;font-size:12px;font-weight:700;cursor:pointer;';
      var cmpResult = document.createElement('div');
      cmpResult.style.cssText = 'width:100%;margin-top:10px;';
      cmpBtn.addEventListener('click', function() {
        renderCompareResult(cmpResult, WV.Snapshots.compare(selA.value, selB.value));
      });
      compareBar.appendChild(label);
      compareBar.appendChild(selA);
      compareBar.appendChild(selB);
      compareBar.appendChild(cmpBtn);
      compareBar.appendChild(cmpResult);
      list.appendChild(compareBar);
    }

    // Snapshot rows
    for (var i = 0; i < filtered.length; i++) {
      var s = filtered[i];
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border:1px solid var(--border-color,#eef2f7);border-radius:12px;margin-bottom:10px;background:var(--card-bg,#fff);';
      var left = document.createElement('div');
      var title = document.createElement('div');
      title.textContent = (s.portfolioName || 'Portfolio') + ' \u2022 ' + fmtDate(s.createdAt);
      title.style.cssText = 'font-weight:700;font-size:13px;color:var(--text-primary);';
      var meta = document.createElement('div');
      meta.textContent = (s.holdings ? s.holdings.length : 0) + ' holdings';
      meta.style.cssText = 'opacity:0.65;font-size:12px;margin-top:2px;color:var(--text-secondary);';
      left.appendChild(title);
      left.appendChild(meta);

      if (s.holdings && s.holdings.length) {
        var tags = document.createElement('div');
        tags.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;';
        var max = Math.min(s.holdings.length, 8);
        for (var j = 0; j < max; j++) {
          var tag = document.createElement('span');
          tag.textContent = s.holdings[j].ticker;
          tag.style.cssText = 'font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(46,134,171,0.1);color:#2E86AB;';
          tags.appendChild(tag);
        }
        if (s.holdings.length > 8) {
          var more = document.createElement('span');
          more.textContent = '+' + (s.holdings.length - 8);
          more.style.cssText = 'font-size:10px;font-weight:600;padding:2px 6px;color:var(--text-secondary);';
          tags.appendChild(more);
        }
        left.appendChild(tags);
      }

      var right = document.createElement('div');
      right.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';
      var restore = document.createElement('button');
      restore.textContent = 'Restore';
      restore.style.cssText = 'padding:8px 12px;border-radius:10px;border:0;background:#2E86AB;color:#fff;font-size:12px;font-weight:700;cursor:pointer;';
      restore.setAttribute('data-id', s.snapshotId);
      restore.addEventListener('click', function(){ WV.Snapshots.restoreAsNewPortfolio(this.getAttribute('data-id')); });
      var del = document.createElement('button');
      del.textContent = 'Delete';
      del.style.cssText = 'padding:8px 12px;border-radius:10px;border:1.5px solid var(--border-color,#dbe6f2);background:var(--card-bg,#fff);color:var(--text-primary);font-size:12px;font-weight:600;cursor:pointer;';
      del.setAttribute('data-id', s.snapshotId);
      del.addEventListener('click', function(){ WV.Snapshots.delete(this.getAttribute('data-id')); });

      right.appendChild(restore);
      right.appendChild(del);
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    }
  };

  // ── Detect pages ──
  function isLibraryPage() {
    var path = location.pathname.toLowerCase();
    var hash = (location.hash || '').toLowerCase();
    return path.indexOf('library') !== -1 || hash.indexOf('library') !== -1 || !!findLibraryListContainer();
  }

  function isVisualizerPage() {
    var path = location.pathname.toLowerCase();
    var hash = (location.hash || '').toLowerCase();
    return path.indexOf('visualizer') !== -1 || hash.indexOf('visualizer') !== -1
        || !!document.getElementById('holdings-container')
        || !!document.getElementById('saveSnapshotBtn');
  }

  function maybeAutoRenderLibrary() {
    if (!isLibraryPage()) return;
    try {
      WV.Snapshots.renderLibrary();
      var filterEl = findLibraryPortfolioFilter();
      if (filterEl && !filterEl.__wvBound) {
        filterEl.__wvBound = true;
        filterEl.addEventListener('change', function(){ WV.Snapshots.renderLibrary(); });
      }
    } catch(e) { console.error('[Snapshots] Library render error:', e); }
  }

  // ── Inject CSS for button alignment ──
  function injectButtonAlignCSS() {
    if (document.getElementById('wv-snap-btn-css')) return;
    var style = document.createElement('style');
    style.id = 'wv-snap-btn-css';
    style.textContent = [
      '.wv-viz-btn-row{display:flex!important;gap:10px!important;align-items:stretch!important;margin-top:20px!important;}',
      '.wv-viz-btn-row .visualize-btn{flex:1 1 auto!important;margin-top:0!important;}',
      '.wv-viz-btn-row .wv-save-snap-btn{flex:0 0 auto!important;margin:0!important;padding:12px 16px!important;background:#0f766e!important;color:#fff!important;border:none!important;border-radius:8px!important;font-size:14px!important;font-weight:600!important;cursor:pointer!important;white-space:nowrap!important;transition:background 0.3s!important;}',
      '.wv-viz-btn-row .wv-save-snap-btn:hover{background:#115e59!important;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Bind on visualizer page ──
  function bindVisualizerButton() {
    if (!isVisualizerPage()) return;
    injectButtonAlignCSS();

    var vizBtn = document.querySelector('.visualize-btn');
    if (!vizBtn || vizBtn.__wvSnapAligned) return;
    vizBtn.__wvSnapAligned = true;

    // Remove existing save snapshot button (the broken one from HTML)
    var oldSnapBtn = null;
    var allBtns = document.querySelectorAll('button');
    for (var i = 0; i < allBtns.length; i++) {
      if ((allBtns[i].textContent || '').indexOf('Save Snapshot') !== -1) {
        oldSnapBtn = allBtns[i];
        break;
      }
    }
    if (oldSnapBtn) oldSnapBtn.remove();

    // Create clean snapshot button
    var snapBtn = document.createElement('button');
    snapBtn.className = 'wv-save-snap-btn';
    snapBtn.innerHTML = '&#128190; Save Snapshot';
    snapBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      doSaveSnapshot();
    }, true);

    // Wrap both in a flex row
    var wrapper = document.createElement('div');
    wrapper.className = 'wv-viz-btn-row';
    vizBtn.parentElement.insertBefore(wrapper, vizBtn);
    wrapper.appendChild(vizBtn);
    wrapper.appendChild(snapBtn);
  }

  // ── Init with retry ──
  function init() {
    bindVisualizerButton();
    maybeAutoRenderLibrary();
  }

  function initWithRetry() {
    init();
    var retries = 0;
    var interval = setInterval(function() {
      retries++;
      init();
      if (retries >= 5) clearInterval(interval);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWithRetry, { once: true });
  } else {
    initWithRetry();
  }

  window.addEventListener('hashchange', init);
  window.addEventListener('popstate', init);

})();
