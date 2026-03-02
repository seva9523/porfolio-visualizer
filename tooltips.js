(function(){
  let openTip = null;

  function closeTip(){
    if(openTip){
      openTip.remove();
      openTip = null;
    }
  }

  function placeTip(anchor, tip){
    const r = anchor.getBoundingClientRect();
    const padding = 10;
    const maxW = 320;

    // Temporary measure to compute size
    tip.style.left = '-9999px';
    tip.style.top = '-9999px';
    document.body.appendChild(tip);
    const tr = tip.getBoundingClientRect();

    let left = Math.min(window.innerWidth - tr.width - padding, Math.max(padding, r.left + r.width/2 - tr.width/2));
    let top = r.bottom + 10;
    // If not enough space below, place above
    if(top + tr.height + padding > window.innerHeight){
      top = r.top - tr.height - 10;
    }
    top = Math.min(window.innerHeight - tr.height - padding, Math.max(padding, top));

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function makeTip(title, body){
    const tip = document.createElement('div');
    tip.className = 'wv-tooltip';
    tip.setAttribute('role','dialog');
    tip.innerHTML = '<div class="t-title"></div><div class="t-body"></div>';
    tip.querySelector('.t-title').textContent = title || 'Info';
    tip.querySelector('.t-body').innerHTML = (body || '').replace(/\n/g,'<br>');
    return tip;
  }

  function onIconClick(e){
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const title = btn.getAttribute('data-title') || 'Info';
    const body = btn.getAttribute('data-body') || btn.getAttribute('data-tip') || '';

    // Toggle
    if(openTip && btn.getAttribute('aria-expanded') === 'true'){
      btn.setAttribute('aria-expanded','false');
      closeTip();
      return;
    }

    // Close existing
    document.querySelectorAll('.wv-tip[aria-expanded="true"]').forEach(x => x.setAttribute('aria-expanded','false'));
    closeTip();

    btn.setAttribute('aria-expanded','true');
    const tip = makeTip(title, body);
    openTip = tip;
    placeTip(btn, tip);
  }

  function wire(){
    document.querySelectorAll('.wv-tip').forEach(btn => {
      if(btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.setAttribute('type','button');
      btn.setAttribute('aria-expanded','false');
      btn.addEventListener('click', onIconClick);
      btn.addEventListener('keydown', (e)=>{
        if(e.key === 'Escape'){
          btn.setAttribute('aria-expanded','false');
          closeTip();
        }
      });
    });
  }

  document.addEventListener('click', (e)=>{
    if(openTip){
      // if clicked inside tooltip, ignore
      if(e.target && e.target.closest && e.target.closest('.wv-tooltip')) return;
      document.querySelectorAll('.wv-tip[aria-expanded="true"]').forEach(x => x.setAttribute('aria-expanded','false'));
      closeTip();
    }
  });
  window.addEventListener('resize', ()=>{
    // close on resize to avoid weird positioning
    document.querySelectorAll('.wv-tip[aria-expanded="true"]').forEach(x => x.setAttribute('aria-expanded','false'));
    closeTip();
  });

  document.addEventListener('DOMContentLoaded', wire);
  // In case pages render metrics dynamically
  const mo = new MutationObserver(()=>wire());
  mo.observe(document.documentElement, {subtree:true, childList:true});
})();
