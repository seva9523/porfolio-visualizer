/**
 * WealthView URL Share (Roadmap #17)
 * - Generates a shareable link that encodes the CURRENT portfolio into the URL hash.
 * - Opening the link imports the portfolio into localStorage and selects it.
 *
 * Notes:
 * - Uses location.hash (not querystring) so the payload is not sent to the server.
 * - No external libraries.
 * - Graceful limits: warns if payload becomes too large.
 */

(function () {
  'use strict';

  const g = (typeof window !== 'undefined') ? window : globalThis;

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }

  function base64UrlEncode(str) {
    // UTF-8 safe base64
    const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
    const b64 = btoa(utf8);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function base64UrlDecode(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
      + '==='.slice((b64url.length + 3) % 4);
    const bin = atob(b64);
    const utf8 = Array.prototype.map.call(bin, c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
    return decodeURIComponent(utf8);
  }

  function toast(msg, ms = 2600) {
    try {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.bottom = '22px';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = '99999';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.background = 'rgba(0,0,0,0.75)';
      el.style.color = '#fff';
      el.style.fontSize = '13px';
      el.style.border = '1px solid rgba(255,255,255,0.15)';
      el.style.backdropFilter = 'blur(6px)';
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.25s'; }, ms - 250);
      setTimeout(() => { el.remove(); }, ms);
    } catch {
      // fallback
      alert(msg);
    }
  }

  function getCurrentPortfolioFromStorage() {
    const portfolios = safeParse(localStorage.getItem('portfolios')) || {};
    const currentId = localStorage.getItem('currentPortfolio') || '';
    const raw = portfolios[currentId];
    if (!raw) return null;

    // Normalize holdings to a compact & stable shape
    const name = raw.name || raw.portfolioName || currentId || 'Shared Portfolio';
    const holdings = Array.isArray(raw.holdings) ? raw.holdings : [];

    const normHoldings = holdings
      .filter(h => h && (h.ticker || h.symbol))
      .map(h => ({
        ticker: String(h.ticker || h.symbol).trim().toUpperCase(),
        shares: Number(h.shares ?? h.quantity ?? 0) || 0,
        purchasePrice: (h.purchasePrice != null) ? Number(h.purchasePrice) : undefined,
        purchaseDate: (h.purchaseDate != null) ? String(h.purchaseDate) : undefined
      }))
      .filter(h => h.ticker && h.shares > 0);

    return { id: currentId, name, holdings: normHoldings };
  }

  function ensureLatestHoldingsSaved() {
    // If the visualizer page defines these, use them to persist the latest edits before sharing.
    try {
      if (typeof g.updateHoldingsArray === 'function') g.updateHoldingsArray();
      if (g.portfolios && g.currentPortfolio && Array.isArray(g.holdings)) {
        if (g.portfolios[g.currentPortfolio]) {
          g.portfolios[g.currentPortfolio].holdings = g.holdings;
        }
      }
      if (typeof g.saveAllPortfolios === 'function') g.saveAllPortfolios();
    } catch {
      // ignore — we'll still share whatever is currently in localStorage
    }
  }

  function makeSharePayload() {
    const p = getCurrentPortfolioFromStorage();
    if (!p) return null;

    // Optional: include minimal "view state" if present.
    // Keep it tiny; avoid sending full historical series etc.
    const view = {};
    try {
      const modeEl = document.querySelector('#dataMode') || document.querySelector('[name="dataMode"]');
      if (modeEl && modeEl.value) view.mode = String(modeEl.value);
      const rangeEl = document.querySelector('#timeRange') || document.querySelector('[name="timeRange"]');
      if (rangeEl && rangeEl.value) view.range = String(rangeEl.value);
    } catch {}

    return {
      v: 1,
      ts: Date.now(),
      portfolio: { name: p.name, holdings: p.holdings },
      view
    };
  }

  function buildShareUrl(payload) {
    const encoded = base64UrlEncode(JSON.stringify(payload));
    const url = new URL(location.href);
    url.hash = `#wvshare=${encoded}`;
    return url.toString();
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }

  async function copyShareLink() {
    ensureLatestHoldingsSaved();
    const payload = makeSharePayload();
    if (!payload) {
      toast('No portfolio found to share. Save or select a portfolio first.');
      return;
    }

    const url = buildShareUrl(payload);

    // Soft limit: many browsers start failing around ~2k-8k chars depending on context.
    if (url.length > 7000) {
      toast('This portfolio link is too large to share as a URL. Try fewer holdings.');
      return;
    }

    try {
      await copyToClipboard(url);
      toast('Share link copied to clipboard ✅');
    } catch {
      toast('Could not copy automatically. Link is in the address bar hash.');
      location.hash = url.split('#')[1];
    }
  }

  function importSharedPortfolioIfPresent() {
    const hash = location.hash || '';
    const m = hash.match(/#wvshare=([A-Za-z0-9\-_]+)/);
    if (!m) return false;

    let decoded = '';
    let payload = null;
    try {
      decoded = base64UrlDecode(m[1]);
      payload = safeParse(decoded);
    } catch {
      // invalid hash; ignore
      return false;
    }
    if (!payload || !payload.portfolio || !Array.isArray(payload.portfolio.holdings)) return false;

    const portfolios = safeParse(localStorage.getItem('portfolios')) || {};
    const baseId = 'shared-' + String(m[1]).slice(0, 10);
    let id = baseId;
    let i = 1;
    while (portfolios[id]) { id = `${baseId}-${i++}`; }

    portfolios[id] = {
      name: payload.portfolio.name || 'Shared Portfolio',
      holdings: payload.portfolio.holdings
    };
    localStorage.setItem('portfolios', JSON.stringify(portfolios));
    localStorage.setItem('currentPortfolio', id);

    // Optional: clear the hash to avoid re-importing on refresh.
    // We'll replaceState so back button behaves nicely.
    try {
      history.replaceState(null, document.title, location.pathname + location.search);
    } catch {}

    // If visualizer has init functions, trigger reload of current portfolio.
    // Many WealthView pages read from localStorage on load anyway.
    toast(`Imported shared portfolio: ${portfolios[id].name} ✅`);

    // If we can't hot-refresh, do a light reload so the visualizer picks up the new currentPortfolio.
    try {
      if (document.querySelector('#holdings-container')) {
        setTimeout(() => { location.reload(); }, 250);
      }
    } catch {}

    // Best effort: if there is a loadPortfolio function, call it.
    try {
      if (typeof g.loadCurrentPortfolio === 'function') g.loadCurrentPortfolio();
      else if (typeof g.loadPortfolio === 'function') g.loadPortfolio(id);
      else if (typeof g.renderHoldings === 'function') g.renderHoldings();
    } catch {}

    return true;
  }

  g.WVShare = g.WVShare || {};
  g.WVShare.copyShareLink = copyShareLink;
  g.WVShare.importSharedPortfolioIfPresent = importSharedPortfolioIfPresent;

  // Auto-import on load
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      importSharedPortfolioIfPresent();
    });
  }
})();
