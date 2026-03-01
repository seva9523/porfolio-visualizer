(function(){
  const LINKS = [
    { href: "library.html", label: "Library" },
    { href: "visualizer.html", label: "Portfolio Visualizer" },
    { href: "goals.html", label: "Goals Simulator" },
    { href: "themes.html", label: "Theme Explorer" },
    { href: "health.html", label: "Health Check" },
    { href: "backtest.html", label: "Multi-Backtest" },
  ];

  function getCurrentFile(){
    const p = (location.pathname || "").split("/").filter(Boolean).pop() || "index.html";
    return p;
  }

  function ensureDarkClassMirrorsLocalStorage(){
    try{
      const saved = localStorage.getItem("wv_theme") || localStorage.getItem("theme") || "";
      if(saved){
        if(saved.toLowerCase().includes("dark")) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    }catch(e){}
  }

  function inject(){
    ensureDarkClassMirrorsLocalStorage();

    // If an existing nav is present anywhere, don't add another.
    if(document.querySelector('.wv-tools-nav')) return;

    const nav = document.createElement("div");
    nav.className = "wv-tools-nav";
    nav.setAttribute("role","navigation");
    nav.setAttribute("aria-label","WealthView tools");

    // Inline fallbacks so the ribbon still shows even if CSS fails to load.
    nav.style.position = 'sticky';
    nav.style.top = '0';
    nav.style.zIndex = '9999';

    const inner = document.createElement("div");
    inner.className = "wv-tools-nav__inner";

    const label = document.createElement("div");
    label.className = "wv-tools-nav__label";
    label.textContent = "Tools";
    inner.appendChild(label);

    const current = getCurrentFile();
    LINKS.forEach(l => {
      const a = document.createElement("a");
      a.className = "wv-tools-nav__link";
      a.href = l.href;
      a.textContent = l.label;
      if(current === l.href || (current === "index.html" && l.href === "library.html")){
        a.setAttribute("aria-current","page");
      }
      inner.appendChild(a);
    });

    const spacer = document.createElement("div");
    spacer.className = "wv-tools-nav__spacer";
    inner.appendChild(spacer);

    const mini = document.createElement("div");
    mini.className = "wv-tools-nav__mini";
    mini.textContent = "Educational only — not financial advice";
    inner.appendChild(mini);

    nav.appendChild(inner);

    const b = document.body;
    if(!b) return;
    b.insertBefore(nav, b.firstChild);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", inject);
  }else{
    inject();
  }
})();
