// WealthView — Plain-Language Portfolio Narrator
// Educational only. No recommendations.
//
// Injects a "Portfolio Story" card into the Portfolio Visualizer (visualizer.html).
// It reads already-rendered metrics from the DOM and turns them into a short narrative.
// If /api/narrate is available, it uses it (and falls back silently if not).

(function(){
  'use strict';

  const CARD_ID = 'wv-narrator-card';
  const API_PATH = '/api/narrate';

  let lastMetricsHash = '';
  let inFlight = null;
  let apiBackoffUntil = 0;

  function safeText(el){ return (el && (el.textContent||'').trim()) || ''; }
  function toNum(s){
    if(!s) return null;
    const m = String(s).replace(/[^0-9.+-]/g,'');
    const n = Number(m);
    return Number.isFinite(n) ? n : null;
  }

  function findStatValue(labelText){
    const labels = document.querySelectorAll('.summary-stat .stat-label');
    for(const lab of labels){
      const t = safeText(lab).toLowerCase();
      if(t.includes(labelText.toLowerCase())){
        const v = lab.parentElement && lab.parentElement.querySelector('.stat-value');
        return safeText(v);
      }
    }
    return '';
  }

  function getMetricCardValueByTitle(title){
    const cards = document.querySelectorAll('.metric-card');
    for(const c of cards){
      const divs = c.querySelectorAll('div');
      if(!divs || divs.length < 2) continue;
      const label = safeText(divs[0]).toLowerCase();
      if(label.includes(title.toLowerCase())) return safeText(divs[1]);
    }
    return '';
  }

  function getOptimizationValue(label){
    const host = document.getElementById('optimization-section');
    if(!host) return '';
    const divs = host.querySelectorAll('div');
    for(const el of divs){
      const t = safeText(el).toLowerCase();
      if(t === label.toLowerCase()){
        const val = el.nextElementSibling;
        if(val) return safeText(val);
      }
    }
    return '';
  }

  function pct(n, digits=1){
    if(n==null || !Number.isFinite(n)) return null;
    return n.toFixed(digits) + '%';
  }

  function sentence(parts){
    const s = parts.filter(Boolean).join(' ')
      .replace(/\s+/g,' ')
      .trim();
    if(!s) return '';
    return s.endsWith('.') ? s : (s + '.');
  }

  function classifySharpe(x){
    if(x==null) return null;
    if(x >= 1.0) return 'strong risk-adjusted performance (historically)';
    if(x >= 0.5) return 'moderate risk-adjusted performance (historically)';
    if(x > 0) return 'lower risk-adjusted performance (historically)';
    return 'negative risk-adjusted performance (historically)';
  }

  function buildNarrative(){
    const holdingsCount = toNum(findStatValue('Number of Holdings'));

    const largest = findStatValue('Largest Position');
    let largestTicker = '';
    let largestPct = null;
    if(largest){
      const m = largest.match(/^\s*([^\s(]+)\s*\(([-+0-9.]+)%\)/);
      if(m){ largestTicker = m[1]; largestPct = Number(m[2]); }
    }

    const riskLevelRaw = getOptimizationValue('Risk Level');
    const diversificationRaw = getOptimizationValue('Diversification Score');
    const largestPosRaw = getOptimizationValue('Largest Position');

    const cagr = toNum(getMetricCardValueByTitle('CAGR'));
    const sharpe = toNum(getMetricCardValueByTitle('Sharpe'));
    const maxDd = toNum(getMetricCardValueByTitle('Max Drawdown'));
    const vol = toNum(getMetricCardValueByTitle('Volatility'));

    let divScore = null;
    if(diversificationRaw){
      const m = diversificationRaw.match(/(\d+)\s*\/\s*10/);
      if(m) divScore = Number(m[1]);
    }

    // Prefer largest position from optimization if present
    const largestPct2 = toNum(largestPosRaw);
    if(largestPct2 != null) largestPct = largestPct2;

    const topHeavy = (largestPct != null && largestPct >= 40);
    const veryTopHeavy = (largestPct != null && largestPct >= 55);
    const fewHoldings = (holdingsCount != null && holdingsCount <= 4);
    const sharpeLabel = classifySharpe(sharpe);

    const lines = [];

    lines.push(sentence([
      'Your portfolio currently holds',
      (holdingsCount != null ? `${Math.round(holdingsCount)} holding${Math.round(holdingsCount)===1?'':'s'}` : null) + ',',
      (riskLevelRaw ? `with a descriptive risk label of **${riskLevelRaw}**` : null),
      (divScore != null ? `and a diversification score of **${divScore}/10**` : null)
    ]));

    if(largestTicker && largestPct != null){
      lines.push(sentence([
        `The largest position is **${largestTicker}** at about **${pct(largestPct)}** of total value.`,
        veryTopHeavy ? 'That means a large share of movement is driven by one holding.' :
        topHeavy ? 'That can make results more sensitive to one holding’s ups and downs.' :
        'That suggests the portfolio isn’t dominated by one holding.'
      ]));
    } else if(largestPct != null){
      lines.push(sentence([
        `Your largest position is about **${pct(largestPct)}** of the portfolio.`,
        veryTopHeavy ? 'That’s a high concentration (descriptive).' :
        topHeavy ? 'That’s a meaningful concentration (descriptive).' :
        'That’s a moderate concentration (descriptive).'
      ]));
    }

    if(fewHoldings){
      lines.push(sentence([
        'With a small number of holdings, diversification depends heavily on whether those assets behave differently.',
        'It’s easier for concentration to creep in when there are only a few positions.'
      ]));
    }

    const perfBits = [];
    if(cagr != null) perfBits.push(`CAGR: **${pct(cagr,2)}**`);
    if(vol != null) perfBits.push(`Volatility: **${pct(vol,2)}**`);
    if(maxDd != null) perfBits.push(`Max drawdown: **${pct(maxDd,2)}**`);
    if(sharpe != null) perfBits.push(`Sharpe: **${sharpe.toFixed(2)}**`);
    if(perfBits.length){
      lines.push(sentence([
        'Over the selected history window, your key metrics are',
        perfBits.join(' · ') + '.',
        sharpeLabel ? `That Sharpe level suggests ${sharpeLabel}.` : null
      ]));
    }

    lines.push('**Educational note:** these summaries describe historical behavior under the tool’s assumptions. They are not predictions or recommendations.');

    return { title: 'Portfolio Story (Plain English)', paragraphs: lines.slice(0, -1), disclaimer: lines[lines.length - 1] };
  }

  // ---------------------------
  // API narrator
  // ---------------------------
  function gatherMetricsForApi(){
    const holdingsCount = toNum(findStatValue('Number of Holdings'));

    const largest = findStatValue('Largest Position');
    let largestTicker = '';
    let largestPct = null;
    if(largest){
      const m = largest.match(/^\s*([^\s(]+)\s*\(([-+0-9.]+)%\)/);
      if(m){ largestTicker = m[1]; largestPct = Number(m[2]); }
    }

    const riskLevelRaw = getOptimizationValue('Risk Level');
    const diversificationRaw = getOptimizationValue('Diversification Score');
    const largestPosRaw = getOptimizationValue('Largest Position');

    let divScore = null;
    if(diversificationRaw){
      const m = diversificationRaw.match(/(\d+)\s*\/\s*10/);
      if(m) divScore = Number(m[1]);
    }

    // Prefer largest position from optimization if present
    const largestPct2 = toNum(largestPosRaw);
    if(largestPct2 != null) largestPct = largestPct2;

    const cagr = toNum(getMetricCardValueByTitle('CAGR'));
    const sharpe = toNum(getMetricCardValueByTitle('Sharpe'));
    const maxDd = toNum(getMetricCardValueByTitle('Max Drawdown'));
    const vol = toNum(getMetricCardValueByTitle('Volatility'));

    return {
      holdingsCount,
      largestTicker: largestTicker || null,
      largestPct,
      riskLabel: riskLevelRaw || null,
      diversificationScore10: divScore,
      cagrPct: cagr,
      volatilityPct: vol,
      maxDrawdownPct: maxDd,
      sharpe
    };
  }

  function hashMetrics(m){
    try {
      const s = JSON.stringify(m, Object.keys(m).sort());
      let h = 0;
      for(let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
      return String(h);
    } catch(_) {
      return String(Date.now());
    }
  }

  async function tryApiNarration(){
    if(Date.now() < apiBackoffUntil) return null;

    const metrics = gatherMetricsForApi();
    const hasSignal = Object.values(metrics).some(v => v != null && v !== '');
    if(!hasSignal) return null;

    const h = hashMetrics(metrics);
    if(h === lastMetricsHash && !inFlight) {
      // Metrics unchanged and no request running; don't spam.
      return null;
    }

    // Deduplicate in-flight calls
    if(inFlight) return inFlight;

    lastMetricsHash = h;

    inFlight = (async () => {
      try {
        const r = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics, context: { page: 'visualizer' } })
        });
        if(!r.ok){
          // Back off on server errors to avoid hammering
          apiBackoffUntil = Date.now() + 30000;
          return null;
        }
        const j = await r.json();
        if(!j || !j.title || !Array.isArray(j.paragraphs)) return null;
        return j;
      } catch(_e){
        apiBackoffUntil = Date.now() + 30000;
        return null;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  function ensureCard(){
    const summaryHost = document.getElementById('summary-section');
    if(!summaryHost) return null;
    let card = document.getElementById(CARD_ID);
    if(card) return card;

    card = document.createElement('div');
    card.id = CARD_ID;
    card.className = 'summary-box';
    card.style.marginTop = '20px';
    summaryHost.appendChild(card);
    return card;
  }

  function renderFromData(card, data){
    card.style.display = 'block';
    const title = data.title || 'Portfolio Story (Plain English)';
    const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : [];
    const disclaimer = data.disclaimer || '';
    card.innerHTML = `
      <h2>🧠 ${title}</h2>
      <div style="margin-top:12px; display:grid; gap:10px;">
        ${paragraphs.map(p => `<div style="font-size:13px; line-height:1.65; color: var(--text-primary);">${p}</div>`).join('')}
        ${disclaimer ? `<div style="font-size:12px; line-height:1.55; opacity:0.85; color: var(--text-secondary);">${disclaimer}</div>` : ''}
      </div>
    `;
  }

  async function render(){
    const card = ensureCard();
    if(!card) return;

    // Prefer API narration if available; otherwise rule-based.
    const api = await tryApiNarration();
    if(api){
      renderFromData(card, api);
      return;
    }

    const rb = buildNarrative();
    // For rule-based, paragraphs already include the educational note; split it.
    const paragraphs = rb.paragraphs || [];
    const disclaimer = rb.disclaimer || '';
    renderFromData(card, { title: rb.title, paragraphs, disclaimer });
  }

  function isInsideNarrator(node){
    if(!node) return false;
    if(node.id === CARD_ID) return true;
    if(typeof node.closest === 'function') {
      return !!node.closest('#' + CARD_ID);
    }
    return false;
  }

  function attachObservers(){
    // Observe only sections that change due to analysis.
    const targets = ['summary-section','optimization-section','correlation-section'];
    const obs = new MutationObserver((mutations) => {
      // Ignore mutations that come only from our own narrator card to prevent loops/spam.
      const meaningful = mutations.some(m => {
        if(isInsideNarrator(m.target)) return false;
        if(m.addedNodes && m.addedNodes.length){
          for(const n of m.addedNodes){ if(!isInsideNarrator(n)) return true; }
          return false;
        }
        return true;
      });
      if(!meaningful) return;

      if(attachObservers._t) clearTimeout(attachObservers._t);
      attachObservers._t = setTimeout(() => { try { render(); } catch(e) {} }, 200);
    });

    targets.forEach(id => {
      const el = document.getElementById(id);
      if(el) obs.observe(el, { childList:true, subtree:true, characterData:true });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('summary-section')) return;
    try { render(); } catch(e) {}
    try { attachObservers(); } catch(e) {}
  });
})();
