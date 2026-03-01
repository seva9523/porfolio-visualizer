
/* WealthView Tools Nav (shared) */
.wv-tools-nav{
  position:sticky; top:0; z-index:50;
  backdrop-filter:saturate(180%) blur(10px);
  /* Match Portfolio Visualizer ribbon feel (subtle teal/sky wash) */
  background:linear-gradient(90deg,
    rgba(224,242,254,.92),
    rgba(204,251,241,.92)
  );
  border-bottom:1px solid rgba(15,23,42,.10);
}
html.dark .wv-tools-nav{
  background:linear-gradient(90deg,
    rgba(2,6,23,.82),
    rgba(2,6,23,.72)
  );
  border-bottom:1px solid rgba(148,163,184,.22);
}
.wv-tools-nav__inner{
  /* Align with the wider app layout used in Portfolio Visualizer */
  width:min(1400px, calc(100% - 40px));
  margin:0 auto;
  padding:10px 0;
  display:flex; gap:10px; align-items:center; flex-wrap:wrap;
}
.wv-tools-nav__label{
  font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase;
  opacity:.7; margin-right:4px;
}
.wv-tools-nav__link{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 10px; border-radius:999px;
  border:1px solid rgba(15,23,42,.12);
  text-decoration:none; font-weight:600; font-size:13px;
  color:inherit; background:rgba(255,255,255,.55);
}
html.dark .wv-tools-nav__link{ border-color:rgba(148,163,184,.22); background:rgba(2,6,23,.35); }
.wv-tools-nav__link:hover{ transform:translateY(-1px); transition:.12s ease; }
.wv-tools-nav__link[aria-current="page"]{
  border-color:rgba(14,165,233,.45);
  box-shadow:0 0 0 3px rgba(14,165,233,.18) inset;
}
.wv-tools-nav__spacer{ flex:1; }
.wv-tools-nav__mini{
  font-size:12px; opacity:.78; padding:6px 10px; border-radius:999px;
  border:1px dashed rgba(15,23,42,.18);
}
html.dark .wv-tools-nav__mini{ border-color:rgba(148,163,184,.25); }
