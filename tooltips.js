
// WealthView Tooltips (P1) — click/tap info icons, mobile-friendly
(() => {
  const TIPS = {
    "CAGR": {
      title: "CAGR",
      body: "Compound annual growth rate — the smooth yearly rate that would turn the starting value into the ending value over the period.",
      analogy: "Like the average speed over a road trip: it ignores the bumps but tells you the overall pace."
    },
    "Sharpe Ratio": {
      title: "Sharpe Ratio",
      body: "Return per unit of risk (volatility). Higher means you historically got more return for each unit of variability taken.",
      analogy: "Like fuel efficiency: how far you went for the risk you spent."
    },
    "Max Drawdown": {
      title: "Max Drawdown",
      body: "The largest peak-to-trough decline over the period. It describes the worst historical drop from a previous high.",
      analogy: "The steepest downhill section on a hike — how far you fell from the highest point."
    },
    "Volatility": {
      title: "Volatility",
      body: "How much returns typically swing up and down. Higher volatility means larger day-to-day (or month-to-month) moves.",
      analogy: "How bumpy the ride feels, not whether you arrive at the destination."
    },
    "Annualized Volatility": {
      title: "Annualized Volatility",
      body: "Volatility scaled to a yearly number so different periods are comparable.",
      analogy: "Turning a weekly step count into an annual estimate so you can compare years."
    },
    "Diversification Score": {
      title: "Diversification",
      body: "A simplified score summarizing how spread-out the portfolio is (across holdings and how differently they move). It’s descriptive, not a recommendation.",
      analogy: "Like not putting all your eggs in one basket — but also using baskets that don’t tip together."
    },
    "Risk Level": {
      title: "Risk Level",
      body: "A descriptive label based on historical volatility, drawdowns, and concentration. It describes behavior, not what you should do.",
      analogy: "A weather label: calm / breezy / stormy — it doesn’t tell you to travel, just what it can feel like."
    },
    "Likelihood": {
      title: "Goal likelihood",
      body: "In simulations, the % of runs that reached your goal by the chosen date under the assumptions you set. Not a guarantee.",
      analogy: "Like a forecast: useful for planning, but real outcomes can differ."
    },
    "Assumed return": {
      title: "Assumed return",
      body: "The average yearly return used for simulations. Changing it changes the simulated outcomes.",
      analogy: "Setting the speed limit for the simulation engine."
    },
    "Variability": {
      title: "Variability",
      body: "How widely returns are allowed to swing around the average in simulations. Higher variability means a wider range of possible paths.",
      analogy: "How wide the lanes are on the highway — wider lanes mean more possible paths."
    }
  };

  let tipEl = null;
  let openFor = null;

  function ensureTooltipEl() {
    if (tipEl) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "wv-tooltip";
    tipEl.style.display = "none";
    tipEl.setAttribute("role", "dialog");
    tipEl.setAttribute("aria-live", "polite");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function closeTip() {
    if (!tipEl) return;
    tipEl.style.display = "none";
    openFor = null;
  }

  function positionTip(anchor) {
    const rect = anchor.getBoundingClientRect();
    const padding = 10;
    const tip = ensureTooltipEl();

    // default: below-right
    let top = rect.bottom + 8;
    let left = rect.left;

    tip.style.maxWidth = "320px";
    tip.style.display = "block";
    const tipRect = tip.getBoundingClientRect();

    // if off-screen right, shift left
    if (left + tipRect.width + padding > window.innerWidth) {
      left = window.innerWidth - tipRect.width - padding;
    }
    // if off-screen bottom, place above
    if (top + tipRect.height + padding > window.innerHeight) {
      top = rect.top - tipRect.height - 8;
    }
    // clamp
    top = Math.max(padding, Math.min(top, window.innerHeight - tipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tipRect.width - padding));

    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function openTip(anchor, key) {
    const tip = ensureTooltipEl();
    const data = TIPS[key];
    if (!data) return;

    tip.innerHTML = `
      <div class="wv-tip-title">${data.title}</div>
      <div class="wv-tip-body">${data.body}</div>
      <div class="wv-tip-analogy">${data.analogy}</div>
    `;
    tip.style.display = "block";
    openFor = anchor;
    positionTip(anchor);
  }

  function isEligibleLabel(el) {
    if (!el || el.nodeType !== 1) return false;
    // Skip navigation/header areas
    if (el.closest("nav, header, .tools-nav, .tools-ribbon, .journey, .guided-journey")) return false;
    // Only simple elements (no complex children)
    if (el.children && el.children.length > 0) return false;
    const txt = (el.textContent || "").trim();
    if (!txt) return false;
    if (txt.length > 40) return false;
    return true;
  }

  function normalizeLabel(t) {
    return (t || "")
      .replace(/\s+/g, " ")
      .replace(/[:\-–—]$/, "")
      .trim();
  }

  function mapLabelToKey(label) {
    const L = label.toLowerCase();
    if (label === "CAGR") return "CAGR";
    if (L === "sharpe" || L === "sharpe ratio") return "Sharpe Ratio";
    if (L.includes("max drawdown") || L === "drawdown") return "Max Drawdown";
    if (L === "volatility" || L.includes("annual") && L.includes("volatility") || L.includes("annualised volatility")) return "Annualized Volatility";
    if (L.includes("diversification") && L.includes("score")) return "Diversification Score";
    if (L.includes("risk level") || L === "risk") return "Risk Level";
    if (L.includes("likelihood")) return "Likelihood";
    if (L.includes("assumed return") || L == "assumed return") return "Assumed return";
    if (L.includes("variability") || L.includes("volatility (") || L.includes("std dev")) return "Variability";
    return null;
  }

  function addIcon(el, key) {
    if (!key) return;
    if (el.querySelector && el.querySelector(".wv-tip-icon")) return;

    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "wv-tip-icon";
    icon.setAttribute("aria-label", `Info: ${key}`);
    icon.textContent = "i";
    icon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // toggle
      if (openFor === icon && tipEl && tipEl.style.display === "block") {
        closeTip();
      } else {
        openTip(icon, key);
      }
    });

    // Insert right after label element
    el.insertAdjacentElement("afterend", icon);
  }

  function scanAndAttach() {
    const candidates = document.querySelectorAll("h1,h2,h3,h4,strong,span,label,th,td,div");
    for (const el of candidates) {
      if (!isEligibleLabel(el)) continue;
      const label = normalizeLabel(el.textContent);
      const key = mapLabelToKey(label);
      if (!key) continue;
      addIcon(el, key);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    scanAndAttach();
    // Close on outside click
    document.addEventListener("click", (e) => {
      if (tipEl && tipEl.style.display === "block") {
        if (openFor && (e.target === openFor || openFor.contains(e.target))) return;
        if (tipEl.contains(e.target)) return;
        closeTip();
      }
    });
    window.addEventListener("resize", () => {
      if (openFor && tipEl && tipEl.style.display === "block") positionTip(openFor);
    });
    window.addEventListener("scroll", () => {
      if (openFor && tipEl && tipEl.style.display === "block") positionTip(openFor);
    }, { passive: true });
  });
})();
