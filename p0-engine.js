/* WealthView P0 Engine (minimal) - browser-only, educational */
window.WV = window.WV || {};

WV.storageKey = 'portfolios';

WV.getPortfolios = function(){
  try{
    const raw = localStorage.getItem(WV.storageKey);
    if(!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj==='object') ? obj : {};
  }catch(e){ return {}; }
};

WV.setPortfolios = function(obj){
  localStorage.setItem(WV.storageKey, JSON.stringify(obj||{}));
};

WV.listPortfolioNames = function(){
  const p=WV.getPortfolios();
  return Object.keys(p);
};

WV.populatePortfolioSelect = function(selectEl){
  const names = WV.listPortfolioNames();
  selectEl.innerHTML='';
  names.forEach(n=>{
    const opt=document.createElement('option');
    opt.value=n; opt.textContent=n;
    selectEl.appendChild(opt);
  });
  if(!names.length){
    const opt=document.createElement('option');
    opt.value=''; opt.textContent='No saved portfolios';
    selectEl.appendChild(opt);
  }
};

function holdingMarketValue(h){
  const shares = Number(h.shares ?? h.quantity ?? 0) || 0;
  const price  = Number(h.currentPrice ?? h.price ?? h.lastPrice ?? 0) || 0;
  const value  = Number(h.value ?? 0) || 0;
  return value || (shares*price);
}

WV.getHoldingsArray = function(portfolioObj){
  if(!portfolioObj) return [];
  const h = portfolioObj.holdings;
  if(Array.isArray(h)) return h;
  if(h && typeof h==='object'){
    // sometimes stored as object keyed by ticker
    return Object.values(h);
  }
  return [];
};

WV.getWeights = function(portfolioObj, maxTickers=12){
  const holdings = WV.getHoldingsArray(portfolioObj)
    .filter(x=>x && (x.ticker || x.symbol))
    .map(x=>{
      const t=(x.ticker||x.symbol||'').toUpperCase().trim();
      return { ticker:t, mv: holdingMarketValue(x) };
    })
    .filter(x=>x.ticker);

  // if market values missing, equal weight
  const limited = holdings.slice(0, maxTickers);
  const totalMv = limited.reduce((s,x)=>s+(x.mv||0),0);

  if(totalMv>0){
    return limited.map(x=>({ticker:x.ticker, weight:(x.mv||0)/totalMv}));
  }
  const uniq = Array.from(new Set(limited.map(x=>x.ticker)));
  const w = uniq.length ? 1/uniq.length : 0;
  return uniq.map(t=>({ticker:t, weight:w}));
};

WV.fetchHistory = async function(ticker, range='1y'){
  const url = `/api/historical?ticker=${encodeURIComponent(ticker)}&range=${encodeURIComponent(range)}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error('history fetch failed');
  const j = await r.json();
  // expected: [{date, close}] or {prices:[...]}
  const arr = Array.isArray(j) ? j : (j.prices||j.data||[]);
  return arr
    .map(d=>({
      date: (d.date||d.time||d.timestamp||d[0]),
      close: Number(d.close ?? d.adjClose ?? d.price ?? d[1])
    }))
    .filter(x=>x.date && isFinite(x.close));
};

WV.alignSeries = function(seriesMap){
  // seriesMap: {name: [{date, close}], ...}
  const keys = Object.keys(seriesMap);
  if(!keys.length) return {dates:[], closes:{}};
  const dateSets = keys.map(k=> new Set(seriesMap[k].map(x=>String(x.date))));
  // intersection
  let common = dateSets[0];
  for(let i=1;i<dateSets.length;i++){
    common = new Set([...common].filter(d=>dateSets[i].has(d)));
  }
  const dates = [...common].sort();
  const closes={};
  keys.forEach(k=>{
    const m = new Map(seriesMap[k].map(x=>[String(x.date), x.close]));
    closes[k]=dates.map(d=>m.get(d));
  });
  return {dates, closes};
};

WV.toReturns = function(closes){
  const rets=[];
  for(let i=1;i<closes.length;i++){
    const a=closes[i-1], b=closes[i];
    if(!isFinite(a)||!isFinite(b)||a<=0){ rets.push(0); continue; }
    rets.push((b/a)-1);
  }
  return rets;
};

WV.cagr = function(closes, periodsPerYear=252){
  if(closes.length<2) return 0;
  const start=closes[0], end=closes[closes.length-1];
  if(!(start>0 && end>0)) return 0;
  const years = (closes.length-1)/periodsPerYear;
  return Math.pow(end/start, 1/years)-1;
};

WV.volatility = function(returns, periodsPerYear=252){
  if(!returns.length) return 0;
  const mean=returns.reduce((s,x)=>s+x,0)/returns.length;
  const varr=returns.reduce((s,x)=>s+Math.pow(x-mean,2),0)/Math.max(1,returns.length-1);
  return Math.sqrt(varr)*Math.sqrt(periodsPerYear);
};

WV.maxDrawdown = function(closes){
  let peak=-Infinity, mdd=0;
  for(const c of closes){
    if(!isFinite(c)) continue;
    peak=Math.max(peak,c);
    if(peak>0) mdd=Math.min(mdd, (c/peak)-1);
  }
  return mdd; // negative
};

WV.hhi = function(weights){
  // Herfindahl-Hirschman Index
  return weights.reduce((s,x)=>s+Math.pow(x.weight||0,2),0);
};
