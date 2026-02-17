// scripts/api-smoke.cjs
const { setTimeout: delay } = require("timers/promises");

const BASE_URL = process.env.BASE_URL || "https://porfolio-visualizer-taca.vercel.app";

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    // not json
  }
  return { res, text, json };
}

function die(msg) {
  console.error("❌ API smoke failed:", msg);
  process.exit(1);
}

async function main() {
  console.log("🔎 API smoke base:", BASE_URL);

  // 1) themes page reachable
  {
    const r = await fetch(`${BASE_URL}/themes.html`);
    if (!r.ok) die(`/themes.html not OK: ${r.status}`);
    console.log("✅ /themes.html OK");
  }

  // 2) themes JSON reachable (supports both /data/themes.json and fallback)
  {
    const { res, json, text } = await fetchJson(`${BASE_URL}/data/themes.json`);
    if (!res.ok) die(`/data/themes.json not OK: ${res.status}`);
    if (!Array.isArray(json)) die(`/data/themes.json not an array. Got: ${text.slice(0, 200)}`);
    if (json.length < 5) die(`/data/themes.json unexpectedly small (${json.length})`);
    console.log(`✅ /data/themes.json OK (${json.length} themes)`);
  }

  // 3) historical endpoint must return JSON with a data object (Yahoo)
  {
    const url = `${BASE_URL}/api/historical?symbol=SPY&from=2020-01-01&to=2020-03-01`;
    const { res, json, text } = await fetchJson(url);
    if (!res.ok) die(`/api/historical not OK: ${res.status}`);
    if (!json || typeof json !== "object") die(`/api/historical did not return JSON: ${text.slice(0, 200)}`);
    if (!json.data || typeof json.data !== "object") die(`/api/historical missing "data" field`);
    const keys = Object.keys(json.data);
    if (keys.length < 10) die(`/api/historical returned too few points (${keys.length})`);
    console.log(`✅ /api/historical OK (${keys.length} points)`);
  }

  // 4) finnhub endpoints: allow either success OR “API key not configured”
  // quote
  {
    const url = `${BASE_URL}/api/quote?symbol=AAPL`;
    const { res, json, text } = await fetchJson(url);
    if (!json) die(`/api/quote did not return JSON: ${text.slice(0, 200)}`);

    if (res.ok) {
      // Finnhub quote fields: c/h/l/o/pc/t etc. We just sanity-check
      if (typeof json.c !== "number") die(`/api/quote OK but missing numeric "c"`);
      console.log("✅ /api/quote OK (key configured)");
    } else {
      // Allowed failure mode
      if (!json.error) die(`/api/quote error response missing "error"`);
      console.log(`✅ /api/quote expected failure handled: ${json.error}`);
    }
  }

  // search
  {
    const url = `${BASE_URL}/api/search?q=aapl`;
    const { res, json, text } = await fetchJson(url);
    if (!json) die(`/api/search did not return JSON: ${text.slice(0, 200)}`);

    if (res.ok) {
      if (!Array.isArray(json.result)) die(`/api/search OK but missing result[]`);
      console.log(`✅ /api/search OK (${json.result.length} results)`);
    } else {
      if (!json.error) die(`/api/search error response missing "error"`);
      console.log(`✅ /api/search expected failure handled: ${json.error}`);
    }
  }

  console.log("🎉 API smoke passed");
}

main().catch((e) => die(e.stack || e.message));
