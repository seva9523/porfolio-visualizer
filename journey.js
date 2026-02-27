/* WealthView Journey (Educational stepper)
   Non-invasive: only reads URL params + localStorage and scrolls/opens modals.
*/
(function(){
  const LS = {
    path: 'wv_journey_path',
    step: 'wv_journey_step',
    done: 'wv_journey_done'
  };

  const PATHS = {
    diversify: {
      label: 'Diversify your portfolio',
      steps: [
        { id:'A1', n:1, label:'Add holdings', url:'index.html?journey=diversify&step=A1', page:'index', view:'overview', anchor:'#portfolio-builder-section', must:'holdings' },
        { id:'A2', n:2, label:'Snapshot', url:'index.html?journey=diversify&step=A2&view=overview', page:'index', view:'overview', anchor:'#portfolio-snapshot-bar' },
        { id:'A3', n:3, label:'Themes', url:'themes.html?journey=diversify&step=A3', page:'themes', anchor:'#tgrid' },
        { id:'A4', n:4, label:'Drift', url:'index.html?journey=diversify&step=A4&view=drift', page:'index', view:'drift', anchor:'#drift-status-panel' },
        { id:'A5', n:5, label:'What‑ifs', url:'index.html?journey=diversify&step=A5&view=sim', page:'index', view:'sim', anchor:'#montecarlo-section' },
        { id:'A6', n:6, label:'Your plan', url:'plan.html?journey=diversify&step=A6', page:'plan', anchor:'#plan-summary' }
      ]
    },
    starter: {
      label: 'Start from income/cash',
      steps: [
        { id:'B1', n:1, label:'Set a goal', url:'goals.html?journey=starter&step=B1', page:'goals', anchor:'#wv-hero', onEnter:'openGoalModal' },
        { id:'B2', n:2, label:'Run scenario', url:'goals.html?journey=starter&step=B2', page:'goals', anchor:'#goals-container', must:'goal' },
        { id:'B3', n:3, label:'Learn themes', url:'themes.html?journey=starter&step=B3', page:'themes', anchor:'#tgrid' },
        { id:'B4', n:4, label:'Choose structure', url:'index.html?journey=starter&step=B4&view=overview', page:'index', view:'overview', anchor:'#portfolio-selector' },
        { id:'B5', n:5, label:'What‑ifs', url:'index.html?journey=starter&step=B5&view=sim', page:'index', view:'sim', anchor:'#montecarlo-section' },
        { id:'B6', n:6, label:'Your plan', url:'plan.html?journey=starter&step=B6', page:'plan', anchor:'#plan-summary' }
      ]
    }
  };

  function qs(){ return new URLSearchParams(location.search); }
  function getPath(){
    const p = qs().get('journey') || localStorage.getItem(LS.path);
    return (p in PATHS) ? p : null;
  }
  function getStepId(path){
    return qs().get('step') || localStorage.getItem(LS.step) || (PATHS[path]?.steps?.[0]?.id);
  }

  function setLS(path, step){
    if (path) localStorage.setItem(LS.path, path);
    if (step) localStorage.setItem(LS.step, step);
  }

  function doneMap(){
    try{ return JSON.parse(localStorage.getItem(LS.done) || '{}'); }catch(e){ return {}; }
  }
  function markDone(path, step){
    const m = doneMap();
    m[path] = m[path] || {};
    m[path][step] = true;
    localStorage.setItem(LS.done, JSON.stringify(m));
  }

  function toast(msg){
    const el = document.createElement('div');
    el.className = 'wvj-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 2400);
  }

  function currentStepObj(path, stepId){
    const steps = PATHS[path].steps;
    return steps.find(s=>s.id===stepId) || steps[0];
  }
  function nextStepObj(path, stepId){
    const steps = PATHS[path].steps;
    const idx = steps.findIndex(s=>s.id===stepId);
    return steps[Math.min(idx+1, steps.length-1)];
  }

  function hasHoldings(){
    try{
      const portfolios = JSON.parse(localStorage.getItem('portfolios') || '{}');
      const current = localStorage.getItem('currentPortfolio');
      const p = portfolios[current];
      const h = p?.holdings || [];
      return Array.isArray(h) && h.filter(x => x && (x.ticker || x.name)).length > 0;
    }catch(e){ return false; }
  }
  function hasGoal(){
    try{
      const goals = JSON.parse(localStorage.getItem('financialGoals') || '[]');
      return Array.isArray(goals) && goals.length > 0;
    }catch(e){ return false; }
  }

  function canAdvance(step){
    if (!step.must) return true;
    if (step.must === 'holdings') return hasHoldings();
    if (step.must === 'goal') return hasGoal();
    return true;
  }

  function scrollToAnchor(anchor){
    if (!anchor) return;
    const el = document.querySelector(anchor);
    if (!el) return;
    try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){ el.scrollIntoView(); }
  }

  function ensureView(step){
    if (!step.view) return;
    if (typeof window.setWVView === 'function') {
      window.setWVView(step.view);
    }
  }

  function handleOnEnter(step){
    // optional onEnter hooks
    if (step.onEnter === 'openGoalModal' && typeof window.openGoalModal === 'function') {
      // only auto-open if no goals yet
      if (!hasGoal()) {
        setTimeout(()=>{ window.openGoalModal(); }, 150);
      }
    }
  }

  function renderStepper(path, stepId){
    const mount = document.getElementById('journey-stepper');
    if (!mount) return;

    const steps = PATHS[path].steps;
    const done = doneMap()?.[path] || {};
    const cur = currentStepObj(path, stepId);

    mount.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'wvj-wrap';

    const left = document.createElement('div');
    left.className = 'wvj-left';
    left.innerHTML = `<div><div class="wvj-badge">Guided Journey</div><div class="wvj-title">${PATHS[path].label}</div></div>`;

    const stepsEl = document.createElement('div');
    stepsEl.className = 'wvj-steps';
    steps.forEach(s=>{
      const a = document.createElement('button');
      a.type='button';
      a.className = 'wvj-step' + (s.id===cur.id ? ' active':'') + (done?.[s.id] ? ' done':'');
      a.innerHTML = `<span class="n">${s.n}</span><span>${s.label}</span>`;
      a.onclick = () => { setLS(path, s.id); location.href = s.url; };
      stepsEl.appendChild(a);
    });

    const right = document.createElement('div');
    right.className = 'wvj-right';

    const back = document.createElement('button');
    back.type='button';
    back.className='wvj-btn secondary';
    back.textContent='Back';
    back.onclick = () => {
      const idx = steps.findIndex(x=>x.id===cur.id);
      const prev = steps[Math.max(0, idx-1)];
      setLS(path, prev.id);
      location.href = prev.url;
    };

    const next = document.createElement('button');
    next.type='button';
    next.className='wvj-btn';
    next.textContent = (cur.id === steps[steps.length-1].id) ? 'Finish' : 'Next';
    next.onclick = () => {
      if (!canAdvance(cur)) {
        if (cur.must === 'holdings') toast('Add at least one holding (or load sample) to continue.');
        else if (cur.must === 'goal') toast('Create at least one goal to continue.');
        else toast('Complete this step to continue.');
        return;
      }
      markDone(path, cur.id);
      const nxt = nextStepObj(path, cur.id);
      setLS(path, nxt.id);
      location.href = nxt.url;
    };

    const exit = document.createElement('button');
    exit.type='button';
    exit.className='wvj-link';
    exit.textContent='Exit guided mode';
    exit.onclick = () => {
      localStorage.removeItem(LS.path);
      localStorage.removeItem(LS.step);
      toast('Guided mode off.');
      // Stay on page, just remove stepper
      mount.innerHTML = '';
    };

    right.appendChild(back);
    right.appendChild(next);
    right.appendChild(exit);

    wrap.appendChild(left);
    wrap.appendChild(stepsEl);
    wrap.appendChild(right);
    mount.appendChild(wrap);

    // Ensure anchor is reachable (some sections hidden until visualized)
    setTimeout(()=>{ scrollToAnchor(cur.anchor); }, 250);
  }

  function init(){
    const path = getPath();
    if (!path) return;

    const stepId = getStepId(path);
    setLS(path, stepId);

    const step = currentStepObj(path, stepId);

    // Respect explicit view param if present
    const viewParam = qs().get('view');
    if (viewParam && typeof window.setWVView === 'function') {
      window.setWVView(viewParam);
    } else {
      ensureView(step);
    }

    handleOnEnter(step);

    // Render stepper
    renderStepper(path, stepId);
  }

  // Public helpers for the Start Journey modal
  window.WVJourney = {
    openStartModal: function(){
      const m = document.getElementById('journey-start-modal');
      if (m) m.style.display='flex';
      else location.href='index.html?journey=diversify&step=A1';
    },
    startPath: function(path){
      if (!(path in PATHS)) return;
      localStorage.setItem(LS.path, path);
      localStorage.setItem(LS.step, PATHS[path].steps[0].id);
      const m = document.getElementById('journey-start-modal');
      if (m) m.style.display='none';
      location.href = PATHS[path].steps[0].url;
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
