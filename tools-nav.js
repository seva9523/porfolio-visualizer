(function(){
  function inject(){
    if(document.querySelector('.wv-toolsbar')) return;
    const bar=document.createElement('div');
    bar.className='wv-toolsbar';
    const inner=document.createElement('div');
    inner.className='inner';
    inner.innerHTML = `
      <span class="label">Tools</span>
      <a href="library.html" data-page="library.html">Library</a>
      <a href="visualizer.html" data-page="visualizer.html">Portfolio Visualizer</a>
      <a href="goals.html" data-page="goals.html">Goals Simulator</a>
      <a href="themes.html" data-page="themes.html">Theme Explorer</a>
      <a href="health.html" data-page="health.html">Health Check</a>
      <a href="backtest.html" data-page="backtest.html">Multi-Backtest</a>
      <span class="spacer"></span>
      <span class="note">Educational only — not financial advice</span>
    `;
    bar.appendChild(inner);
    document.body.prepend(bar);

    const cur=(location.pathname.split('/').pop() || 'index.html').toLowerCase();
    inner.querySelectorAll('a[data-page]').forEach(a=>{
      if(a.getAttribute('data-page').toLowerCase()===cur) a.classList.add('active');
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
