const { calculateFutureValue } = require("../utils/portfolioCalculations");
const {
  calculateDeterministicProjection,
  calculateRequiredContribution,
  runGoalMonteCarloSimulation,
} = require("../goals-engine");

const {
  REBALANCING_STRATEGIES,
  runRebalancingBacktest,
} = require("../rebalancing-engine");

/**
 * These are "professional-grade" edge cases:
 * - 0 years / 1 year
 * - negative returns
 * - huge values (precision / overflow)
 * - withdrawals (negative contribution)
 * - missing historical data
 * - Monte Carlo sanity
 */

describe("Professional edge cases — future value math", () => {
  test("0 years => ending = currentSavings (no time to grow)", () => {
    const fv = calculateFutureValue(12345, 500, 0.07, 0);
    expect(fv).toBeCloseTo(12345, 12);
  });

  test("withdrawals (negative contribution) still returns a finite number", () => {
    const fv = calculateFutureValue(100000, -500, 0.05, 10);
    expect(Number.isFinite(fv)).toBe(true);
  });

  test("very long horizon stays finite (no NaN/Infinity)", () => {
    const fv = calculateFutureValue(10000, 100, 0.07, 80);
    expect(Number.isFinite(fv)).toBe(true);
  });

  test("extreme negative return still finite (as long as return > -100%)", () => {
    const fv = calculateFutureValue(10000, 100, -0.9, 30);
    expect(Number.isFinite(fv)).toBe(true);
  });
});

describe("Professional edge cases — goals engine", () => {
  test("required contribution returns 0 when target already met", () => {
    const req = calculateRequiredContribution(200000, 100000, 0.06, 10);
    expect(req).toBe(0);
  });

  test("deterministic projection with negative return stays finite", () => {
    const out = calculateDeterministicProjection(50000, 200, -0.2, 20);
    expect(Number.isFinite(out)).toBe(true);
  });

  test("Monte Carlo stays within probability bounds and finite percentiles", () => {
    const result = runGoalMonteCarloSimulation({
      currentSavings: 10000,
      monthlyContribution: 200,
      annualReturn: 0.05,
      annualVolatility: 0.25,
      years: 20,
      targetAmount: 50000,
      numSimulations: 300, // keep tests fast
    });

    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(100);

    expect(Number.isFinite(result.percentile10)).toBe(true);
    expect(Number.isFinite(result.medianValue)).toBe(true);
    expect(Number.isFinite(result.percentile90)).toBe(true);

    expect(result.percentile10).toBeLessThanOrEqual(result.medianValue);
    expect(result.medianValue).toBeLessThanOrEqual(result.percentile90);
  });
});

describe("Professional edge cases — backtest robustness", () => {
  test("missing historical data does not crash (returns error or finite metrics)", () => {
    // AAA missing data on the first date, BBB has it
    const holdings = [
      {
        ticker: "AAA",
        shares: 1,
        historicalData: {
          "2020-01-03": { close: 100 },
          "2020-01-06": { close: 100 },
        },
      },
      {
        ticker: "BBB",
        shares: 1,
        historicalData: {
          "2020-01-02": { close: 100 },
          "2020-01-03": { close: 100 },
          "2020-01-06": { close: 100 },
        },
      },
    ];

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: { AAA: 50, BBB: 50 },
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: "2020-01-02",
      endDate: "2020-01-06",
    });

    // Acceptable outcomes:
    // - either the engine returns an error (preferred), OR
    // - it returns results but metrics are finite (also acceptable)
    if (out.error) {
      expect(typeof out.error).toBe("string");
      return;
    }

    expect(Array.isArray(out.portfolioHistory)).toBe(true);
    expect(out.portfolioHistory.length).toBeGreaterThan(0);

    // if it returns metrics, they must be finite
    if (out.metrics) {
      expect(Number.isFinite(out.metrics.totalReturn)).toBe(true);
      expect(Number.isFinite(out.metrics.volatility)).toBe(true);
      expect(Number.isFinite(out.metrics.maxDrawdown)).toBe(true);
      expect(Number.isFinite(out.metrics.cagr)).toBe(true);
    }
  });
});
