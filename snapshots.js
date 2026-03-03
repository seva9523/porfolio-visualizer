/* WealthView Snapshots (Time Machine) — localStorage only
   Stores snapshots under localStorage['wv_snapshots_v1'] as:
   {
     "<portfolioId>": [
        { id, ts, portfolioId, portfolioName, holdings:[{ticker,shares,purchasePrice?,purchaseDate?}] }
     ]
   }
*/
(function(){
  'use strict';
  const g = (typeof window !== 'undefined') ? window : globalThis;
  const WV = g.WV = g.WV || {};
  const KEY = 'wv_snapshots_v1';

  function nowTs(){ return Date.now(); }
  function safeParse(s){ try{ return JSON.parse(s);}catch(e){ return null; } }
  function readStore(){ return safeParse(localStorage.getItem(KEY) || '{}') || {}; }
  function writeStore(obj){ localStorage.setItem(KEY, JSON.stringify(obj||{})); }

  function fmtDate(ts){
    try{
      const d = new Date(ts);
      return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch(e){ return String(ts); }
  }

  function getCurrentPortfolioNormalized(){
    if (!WV.getPortfolios || !WV.getCurrentPortfolioId) return null;
    const map = WV.getPortfolios();
    const pid = WV.getCurrentPortfolioId();
    const p = map[pid];
    if (!p) return null;
    return { pid, portfolio: p };
  }

  function saveSnapshotForCurrent(){
    const cur = getCurrentPortfolioNormalized();
    if (!cur) return { ok:false, error:'No portfolio loaded' };

    const snap = {
      id: 's_' + nowTs().toString(36) + '_' + Math.random().toString(36).slice(2,7),
      ts: nowTs(),
      portfolioId: cur.pid,
      portfolioName: cur.portfolio.name || cur.pid,
      holdings: (cur.portfolio.holdings || []).map(h => ({
        ticker: (h.ticker || '').toString().trim().toUpperCase(),
        shares: Number(h.shares || 0),
        purchasePrice: (h.purchasePrice != null && h.purchasePrice !== '') ? Number(h.purchasePrice) : undefined,
        purchaseDate: (h.purchaseDate != null && h.purchaseDate !== '') ? String(h.purchaseDate) : undefined
      }))
    };

    const store = readStore();
    store[cur.pid] = Array.isArray(store[cur.pid]) ? store[cur.pid] : [];
    store[cur.pid].unshift(snap);
    // cap per-portfolio to avoid unbounded storage
    store[cur.pid] = store[cur.pid].slice(0, 50);
    writeStore(store);

    return { ok:true, snapshot:snap };
  }

  function listSnapshots(portfolioId){
    const store = readStore();
    const arr = Array.isArray(store[portfolioId]) ? store[portfolioId] : [];
    return arr.slice();
  }

  function deleteSnapshot(portfolioId, snapshotId){
    const store = readStore();
    const arr = Array.isArray(store[portfolioId]) ? store[portfolioId] : [];
    const next = arr.filter(s => s && s.id !== snapshotId);
    store[portfolioId] = next;
    writeStore(store);
    return { ok:true };
  }

  function restoreSnapshotAsNewPortfolio(portfolioId, snapshotId){
    const snaps = listSnapshots(portfolioId);
    const snap = snaps.find(s => s && s.id === snapshotId);
    if (!snap) return { ok:false, error:'Snapshot not found' };

    const raw = safeParse(localStorage.getItem('portfolios') || '{}') || {};
    const newId = 'snap_' + snap.id;
    const name = (snap.portfolioName || 'Portfolio') + ' — Snapshot ' + fmtDate(snap.ts);

    raw[newId] = {
      name,
      holdings: (snap.holdings || []).map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        purchasePrice: h.purchasePrice,
        purchaseDate: h.purchaseDate
      }))
    };

    localStorage.setItem('portfolios', JSON.stringify(raw));
    localStorage.setItem('currentPortfolio', newId);
    return { ok:true, newId };
  }

  // Simple toast helper (matches existing minimal style)
  function toast(msg, ok=true){
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.right = '18px';
    el.style.bottom = '18px';
    el.style.zIndex = '99999';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '12px';
    el.style.fontSize = '13px';
    el.style.fontWeight = '700';
    el.style.color = ok ? '#0f172a' : '#fff';
    el.style.background = ok ? '#d1fae5' : '#ef4444';
    el.style.boxShadow = '0 10px 26px rgba(0,0,0,.18)';
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .35s ease'; }, 1600);
    setTimeout(()=>{ el.remove(); }, 2100);
  }

  WV.Snapshots = {
    KEY,
    saveCurrent: function(){
      const r = saveSnapshotForCurrent();
      if (r.ok) toast('Snapshot saved ✅', true);
      else toast(r.error || 'Snapshot failed', false);
      return r;
    },
    list: listSnapshots,
    delete: deleteSnapshot,
    restoreAsNew: function(portfolioId, snapshotId){
      const r = restoreSnapshotAsNewPortfolio(portfolioId, snapshotId);
      if (r.ok) toast('Snapshot restored ✅', true);
      else toast(r.error || 'Restore failed', false);
      return r;
    },
    fmtDate
  };

})();
