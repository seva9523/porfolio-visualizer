const {
  REBALANCING_STRATEGIES,
  calculatePortfolioValue,
  runRebalancingBacktest,
} = require("../rebalancing-engine");

/**
 * These tests verify that the "chart-ready data" (portfolioHistory / allocationHistory)
 * is accurate, consistent, sorted, and matches the engine math.
 *
 * Important: We’re not testing Chart.js rendering. We’re testing the numbers charts consume.
 */

function makeHoldingsWithCompleteData() {
  const dates = [
    "2020-01-02",
    "2020-01-03",
    "2020-01-06",
    "2020-01-07",
    "2020-01-08",
  ];

  // Simple deterministic prices
  const histA = {
    "2020-01-02": { close: 100 },
    "2020-01-03": { close: 110 },
    "2020-01-06": { close: 120 },
    "2020-01-07": { close: 130 },
    "2020-01-08": { close: 140 },
  };

  const histB = {
    "2020-01-02": { close: 200 },
    "2020-01-03": { close: 200 },
    "2020-01-06": { close: 200 },
    "2020-01-07": { close: 200 },
    "2020-01-08": { close: 200 },
  };

  const holdings = [
    { ticker: "AAA", shares: 2, historicalData: histA },
    { ticker: "BBB", shares: 1, historicalData: histB },
  ];

  return { holdings, dates };
}

describe("Chart data accuracy — portfolioHistory is correct", () => {
  test("portfolioHistory dates are sorted and match the requested date range", () => {
    const { holdings, dates } = makeHoldingsWithCompleteData();

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    expect(out.error).toBeUndefined();
    expect(out.portfolioHistory.length).toBe(dates.length);

    // Date order + exact match
    for (let i = 0; i < dates.length; i++) {
      expect(out.portfolioHistory[i].date).toBe(dates[i]);
    }
  });

  test("portfolioHistory values equal calculatePortfolioValue when strategy = NONE", () => {
    const { holdings, dates } = makeHoldingsWithCompleteData();

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    // With strategy NONE, holdings never change, so chart values must equal direct valuation each day
    for (const point of out.portfolioHistory) {
      const expected = calculatePortfolioValue(holdings, point.date);
      expect(point.value).toBeCloseTo(expected, 12);
      expect(Number.isFinite(point.value)).toBe(true);
    }
  });

  test("metrics.totalReturn matches chart start/end values", () => {
    const { holdings, dates } = makeHoldingsWithCompleteData();

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    const start = out.portfolioHistory[0].value;
    const end = out.portfolioHistory[out.portfolioHistory.length - 1].value;

    const expectedTotalReturnPct = ((end - start) / start) * 100;
    expect(out.metrics.totalReturn).toBeCloseTo(expectedTotalReturnPct, 10);
  });
});

describe("Chart data accuracy — allocationHistory is sane (if present)", () => {
  test("allocationHistory values are finite and weights sum to ~100 when provided", () => {
    const { holdings, dates } = makeHoldingsWithCompleteData();

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    // Some runs may provide allocationHistory depending on engine output
    if (!out.allocationHistory) return;

    expect(Array.isArray(out.allocationHistory)).toBe(true);
    expect(out.allocationHistory.length).toBe(out.portfolioHistory.length);

    for (const row of out.allocationHistory) {
      let sum = 0;
      for (const [k, v] of Object.entries(row.weights || row)) {
        if (k === "date") continue;
        if (typeof v === "number") {
          expect(Number.isFinite(v)).toBe(true);
          sum += v;
        }
      }
      // allow tiny floating error
      expect(sum).toBeGreaterThan(99.99);
      expect(sum).toBeLessThan(100.01);
    }
  });
});
