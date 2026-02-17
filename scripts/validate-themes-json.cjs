// scripts/validate-themes-json.cjs
const fs = require("fs");
const path = require("path");

const FILE = process.env.THEMES_JSON_PATH
  ? path.resolve(process.env.THEMES_JSON_PATH)
  : path.resolve("data/themes.json");

const ALLOWED_CATEGORIES = new Set(["growth", "defensive", "income", "alternative"]);

function fail(msg) {
  console.error("❌ themes.json validation failed:", msg);
  process.exit(1);
}

function warn(msg) {
  console.warn("⚠️", msg);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function main() {
  if (!fs.existsSync(FILE)) {
    fail(`File not found: ${FILE}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(FILE, "utf8");
  } catch (e) {
    fail(`Cannot read file: ${e.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON: ${e.message}`);
  }

  if (!Array.isArray(data)) {
    fail("Top-level JSON must be an array of theme objects.");
  }

  if (data.length < 1) {
    fail("themes.json array is empty.");
  }

  const ids = new Set();
  const names = new Set();

  let invalidCount = 0;

  data.forEach((t, idx) => {
    const at = (field) => `Theme index ${idx} (${t?.id || "no-id"}) field "${field}"`;

    // Required
    if (!isNonEmptyString(t.id)) {
      invalidCount++; warn(`${at("id")} must be a non-empty string.`);
      return;
    }
    if (ids.has(t.id)) {
      invalidCount++; warn(`Duplicate theme id: "${t.id}"`);
      return;
    }
    ids.add(t.id);

    if (!isNonEmptyString(t.name)) {
      invalidCount++; warn(`${at("name")} must be a non-empty string.`);
    } else {
      const key = t.name.trim().toLowerCase();
      if (names.has(key)) warn(`Possible duplicate theme name: "${t.name}"`);
      names.add(key);
    }

    if (!isNonEmptyString(t.description)) {
      invalidCount++; warn(`${at("description")} must be a non-empty string.`);
    }

    if (!isNonEmptyString(t.category) || !ALLOWED_CATEGORIES.has(t.category)) {
      invalidCount++; warn(`${at("category")} must be one of: ${Array.from(ALLOWED_CATEGORIES).join(", ")}`);
    }

    if (!isNonEmptyString(t.megaTheme)) {
      invalidCount++; warn(`${at("megaTheme")} must be a non-empty string.`);
    }

    if (!isStringArray(t.tags)) {
      invalidCount++; warn(`${at("tags")} must be an array of strings.`);
    }

    if (!isStringArray(t.representativeAssets) || t.representativeAssets.length < 1) {
      invalidCount++; warn(`${at("representativeAssets")} must be a non-empty array of strings (proxy tickers).`);
    }

    if (!isStringArray(t.benchmarks) || t.benchmarks.length < 1) {
      warn(`${at("benchmarks")} should be a non-empty array (default SPY).`);
    }

    // These are important for your beginner UX
    if (!t.risks || !isStringArray(t.risks) || t.risks.length < 2) {
      warn(`${at("risks")} should be an array with at least 2 items.`);
    }
    if (!t.whoItsFor || !isStringArray(t.whoItsFor) || t.whoItsFor.length < 2) {
      warn(`${at("whoItsFor")} should be an array with at least 2 items.`);
    }
    if (!t.whoItsNotFor || !isStringArray(t.whoItsNotFor) || t.whoItsNotFor.length < 2) {
      warn(`${at("whoItsNotFor")} should be an array with at least 2 items.`);
    }

    // lastUpdated: allow "", YYYY-MM, or ISO date
    if (t.lastUpdated && typeof t.lastUpdated === "string") {
      const s = t.lastUpdated.trim();
      if (s && !/^\d{4}-\d{2}(-\d{2})?$/.test(s)) {
        warn(`${at("lastUpdated")} should look like YYYY-MM or YYYY-MM-DD (got "${t.lastUpdated}").`);
      }
    }
  });

  if (invalidCount > 0) {
    fail(`${invalidCount} theme(s) had critical issues. Fix them and re-run.`);
  }

  console.log(`✅ themes.json OK — ${data.length} themes, ${ids.size} unique ids.`);
}

main();
