const {
  REBALANCING_STRATEGIES,
  calculatePortfolioValue,
  calculateCurrentWeights,
  needsRebalancing,
  rebalancePortfolio,
  getAllTradingDates,
  runRebalancingBacktest,
} = require("../rebalancing-engine");

function makeHoldings() {
  // 5 trading days
  const dates = ["2020-01-02", "2020-01-03", "2020-01-06", "2020-01-07", "2020-01-08"];

  // Asset A rallies hard, Asset B falls -> creates drift
  const histA = {
    "2020-01-02": { close: 100 },
    "2020-01-03": { close: 120 },
    "2020-01-06": { close: 150 },
    "2020-01-07": { close: 180 },
    "2020-01-08": { close: 200 },
  };
  const histB = {
    "2020-01-02": { close: 100 },
    "2020-01-03": { close: 90 },
    "2020-01-06": { close: 80 },
    "2020-01-07": { close: 60 },
    "2020-01-08": { close: 50 },
  };

  const holdings = [
    { ticker: "AAA", shares: 1, historicalData: histA },
    { ticker: "BBB", shares: 1, historicalData: histB },
  ];

  return { holdings, dates };
}

describe("Rebalancing Engine — correctness & sanity", () => {
  test("getAllTradingDates returns all sorted dates", () => {
    const { holdings, dates } = makeHoldings();
    const all = getAllTradingDates(holdings);
    expect(all).toEqual(dates);
  });

  test("calculatePortfolioValue sums shares * close", () => {
    const { holdings } = makeHoldings();
    const valueDay1 = calculatePortfolioValue(holdings, "2020-01-02");
    expect(valueDay1).toBe(200); // 1*100 + 1*100
  });

  test("calculateCurrentWeights sums to ~100%", () => {
    const { holdings } = makeHoldings();
    const w = calculateCurrentWeights(holdings, "2020-01-02");
    const sum = (w.AAA || 0) + (w.BBB || 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  test("needsRebalancing triggers when drift exceeds threshold", () => {
    const currentWeights = { AAA: 80, BBB: 20 };
    const targetWeights = { AAA: 50, BBB: 50 };
    expect(needsRebalancing(currentWeights, targetWeights, 5)).toBe(true);
    expect(needsRebalancing(currentWeights, targetWeights, 40)).toBe(false);
  });

  test("rebalancePortfolio moves weights toward target on a given date", () => {
    const { holdings } = makeHoldings();
    const targetWeights = { AAA: 50, BBB: 50 };

    const rebalanced = rebalancePortfolio(holdings, targetWeights, "2020-01-02");
    const w = calculateCurrentWeights(rebalanced, "2020-01-02");

    expect((w.AAA || 0) + (w.BBB || 0)).toBeCloseTo(100, 8);
    expect(w.AAA).toBeCloseTo(50, 6);
    expect(w.BBB).toBeCloseTo(50, 6);
  });

  test("runBacktest returns sane history and metrics (no strategy)", () => {
    const { holdings, dates } = makeHoldings();
    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    expect(out.error).toBeUndefined();
    expect(out.portfolioHistory.length).toBe(dates.length);
    expect(out.startDate).toBe(dates[0]);
    expect(out.endDate).toBe(dates[dates.length - 1]);

    // metrics should be finite numbers
    expect(Number.isFinite(out.metrics.cagr)).toBe(true);
    expect(Number.isFinite(out.metrics.volatility)).toBe(true);
    expect(Number.isFinite(out.metrics.maxDrawdown)).toBe(true);
    expect(Number.isFinite(out.metrics.totalReturn)).toBe(true);
  });

  test("threshold strategy should rebalance at least once in this drifting example", () => {
    const { holdings, dates } = makeHoldings();
    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.THRESHOLD,
      threshold: 5,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    expect(out.error).toBeUndefined();
    expect(out.rebalanceCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(out.rebalanceDates)).toBe(true);
  });
});
