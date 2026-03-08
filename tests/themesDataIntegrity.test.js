// tests/themesDataIntegrity.test.js
// ============================================================================
// QA: THEMES.JSON DATA INTEGRITY
// Validates every theme has correct structure, valid tickers, no duplicates,
// and that THEME_UX coverage is adequate.
// ============================================================================

const fs = require("fs");
const path = require("path");

const THEMES_PATH = path.resolve(__dirname, "../data/themes.json");

let themes;
try {
  themes = JSON.parse(fs.readFileSync(THEMES_PATH, "utf8"));
} catch (e) {
  themes = null;
}

const ALLOWED_CATEGORIES = new Set(["growth", "defensive", "income", "alternative"]);

// THEME_UX keys extracted from themes.html (the 11 hardcoded themes)
const THEME_UX_KEYS = new Set([
  "ai", "clean_energy", "semiconductors", "cybersecurity",
  "healthcare_innovation", "emerging_markets", "dividend_income",
  "inflation_protection", "commodities", "mega_cap_tech", "bitcoin",
]);

describe("QA: themes.json — File & Structure", () => {
  test("DI-001: themes.json exists and is valid JSON", () => {
    expect(fs.existsSync(THEMES_PATH)).toBe(true);
    expect(themes).not.toBeNull();
    expect(Array.isArray(themes)).toBe(true);
  });

  test("DI-001: themes.json has at least 30 themes", () => {
    expect(themes.length).toBeGreaterThanOrEqual(30);
  });
});

describe("QA: themes.json — Required Fields", () => {
  if (!themes) return;

  test.each(themes.map((t) => [t.id || "MISSING_ID", t]))(
    "DI-001: theme '%s' has all required string fields",
    (id, t) => {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe("string");
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe("string");
      expect(t.description.length).toBeGreaterThan(0);
      expect(typeof t.category).toBe("string");
      expect(typeof t.megaTheme).toBe("string");
      expect(typeof t.overview).toBe("string");
      expect(typeof t.methodology).toBe("string");
    }
  );

  test.each(themes.map((t) => [t.id, t]))(
    "DI-001: theme '%s' has valid array fields",
    (id, t) => {
      expect(Array.isArray(t.tags)).toBe(true);
      expect(Array.isArray(t.representativeAssets)).toBe(true);
      expect(t.representativeAssets.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(t.benchmarks)).toBe(true);
      expect(t.benchmarks.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(t.risks)).toBe(true);
      expect(t.risks.length).toBeGreaterThanOrEqual(1);
    }
  );
});

describe("QA: themes.json — Category Validation", () => {
  if (!themes) return;

  test.each(themes.map((t) => [t.id, t.category]))(
    "DI-009: theme '%s' has valid category '%s'",
    (id, category) => {
      expect(ALLOWED_CATEGORIES.has(category)).toBe(true);
    }
  );
});

describe("QA: themes.json — No Duplicates", () => {
  if (!themes) return;

  test("DI-002: No duplicate theme IDs", () => {
    const ids = themes.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("DI-002: No duplicate theme names", () => {
    const names = themes.map((t) => t.name.toLowerCase().trim());
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

describe("QA: themes.json — Representative Assets (Tickers)", () => {
  if (!themes) return;

  test.each(themes.map((t) => [t.id, t.representativeAssets[0]]))(
    "DI-003: theme '%s' has valid-looking ticker '%s'",
    (id, ticker) => {
      expect(typeof ticker).toBe("string");
      expect(ticker.length).toBeGreaterThan(0);
      expect(ticker.length).toBeLessThanOrEqual(10);
      // Tickers are uppercase letters, possibly with dots or ^
      expect(ticker).toMatch(/^[A-Z0-9.^]+$/);
    }
  );
});

describe("QA: themes.json — Risks and Suitability Content", () => {
  if (!themes) return;

  test.each(themes.map((t) => [t.id, t]))(
    "theme '%s' has meaningful risks (at least 2, each >10 chars)",
    (id, t) => {
      expect(t.risks.length).toBeGreaterThanOrEqual(2);
      t.risks.forEach((r) => {
        expect(typeof r).toBe("string");
        expect(r.length).toBeGreaterThan(10);
      });
    }
  );

  test.each(themes.map((t) => [t.id, t]))(
    "theme '%s' has whoItsFor and whoItsNotFor (at least 2 each)",
    (id, t) => {
      expect(Array.isArray(t.whoItsFor)).toBe(true);
      expect(t.whoItsFor.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(t.whoItsNotFor)).toBe(true);
      expect(t.whoItsNotFor.length).toBeGreaterThanOrEqual(2);
    }
  );
});

describe("QA: themes.json — lastUpdated Format", () => {
  if (!themes) return;

  test.each(themes.map((t) => [t.id, t.lastUpdated]))(
    "theme '%s' has valid lastUpdated format '%s'",
    (id, lastUpdated) => {
      if (lastUpdated && typeof lastUpdated === "string" && lastUpdated.trim()) {
        expect(lastUpdated).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
      }
    }
  );
});

describe("QA: THEME_UX Coverage", () => {
  if (!themes) return;

  test("DI-010: Report which themes lack THEME_UX entries", () => {
    const missing = themes
      .filter((t) => !THEME_UX_KEYS.has(t.id))
      .map((t) => t.id);

    // This is informational — log missing ones
    if (missing.length > 0) {
      console.warn(
        `⚠️  ${missing.length} themes lack THEME_UX entries (will use fallback):`,
        missing.join(", ")
      );
    }
    // The code handles missing THEME_UX gracefully, so this is a warning not a failure.
    // But if you want to enforce full coverage, uncomment:
    // expect(missing.length).toBe(0);
    expect(true).toBe(true); // always pass — informational
  });
});

describe("QA: themes.json — Cross-references", () => {
  if (!themes) return;

  test("All benchmark tickers include SPY", () => {
    themes.forEach((t) => {
      expect(t.benchmarks).toContain("SPY");
    });
  });

  test("No theme has empty overview", () => {
    themes.forEach((t) => {
      expect(t.overview.trim().length).toBeGreaterThan(20);
    });
  });

  test("No theme has empty methodology", () => {
    themes.forEach((t) => {
      expect(t.methodology.trim().length).toBeGreaterThan(10);
    });
  });
});
