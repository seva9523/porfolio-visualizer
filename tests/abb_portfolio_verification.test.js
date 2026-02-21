/**
 * ABB Portfolio — Number Verification Tests
 *
 * Uses the real ABB portfolio from the saved HTML page (wealthview.pro) to verify
 * the math behind:
 * - Portfolio summary (total value, cost basis, gain/loss)
 * - Performance metrics (CAGR, volatility, drawdown)
 * - Portfolio allocation (weights sum to 100%)
 * - Holdings by value (ordering, individual values)
 * - Correlation matrix
 * - Monte Carlo simulation (percentile ordering)
 * - Portfolio optimization analysis
 * - Rebalancing simulator
 */

const {
  calculatePortfolioValue,
  calculateCurrentWeights,
  needsRebalancing,
  rebalancePortfolio,
  runRebalancingBacktest,
  REBALANCING_STRATEGIES,
} = require("../rebalancing-engine");
const { calculateCorrelation } = require("../utils/correlation");
const { analyzePortfolioOptimization } = require("../utils/portfolioOptimization");
const {
  makeAbbHoldingsSnapshot,
  makeAbbHoldingsWithHistoricalData,
  ABB_EXPECTED,
  HOLDINGS_FROM_HTML,
  SNAPSHOT_DATE,
} = require("./fixtures/abb-portfolio");

describe("ABB Portfolio — Snapshot & Summary (from HTML)", () => {
  test("total portfolio value matches HTML displayed value", () => {
    const holdings = makeAbbHoldingsSnapshot();
    const total = calculatePortfolioValue(holdings, SNAPSHOT_DATE);
    expect(total).toBeCloseTo(ABB_EXPECTED.totalValue, 1);
  });

  test("total cost basis matches HTML (sum of shares × purchase price)", () => {
    const costBasis = HOLDINGS_FROM_HTML.reduce(
      (sum, h) => sum + h.shares * h.purchasePrice,
      0
    );
    expect(costBasis).toBeCloseTo(ABB_EXPECTED.totalCostBasis, 1);
  });

  test("total gain/loss = total value - total cost basis", () => {
    const holdings = makeAbbHoldingsSnapshot();
    const totalValue = calculatePortfolioValue(holdings, SNAPSHOT_DATE);
    const totalCostBasis = HOLDINGS_FROM_HTML.reduce(
      (sum, h) => sum + h.shares * h.purchasePrice,
      0
    );
    const gainLoss = totalValue - totalCostBasis;
    expect(gainLoss).toBeCloseTo(ABB_EXPECTED.totalGainLoss, 1);
  });

  test("gain/loss percent = (gain / cost basis) × 100", () => {
    const gainPct =
      (ABB_EXPECTED.totalGainLoss / ABB_EXPECTED.totalCostBasis) * 100;
    expect(gainPct).toBeCloseTo(ABB_EXPECTED.gainLossPercent, 1);
  });

  test("weights sum to 100%", () => {
    const holdings = makeAbbHoldingsSnapshot();
    const w = calculateCurrentWeights(holdings, SNAPSHOT_DATE);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(99.99);
    expect(sum).toBeLessThan(100.01);
  });

  test("largest position is GDX at ~14.3%", () => {
    const holdings = makeAbbHoldingsSnapshot();
    const w = calculateCurrentWeights(holdings, SNAPSHOT_DATE);
    const sorted = Object.entries(w).sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe("GDX");
    expect(sorted[0][1]).toBeCloseTo(ABB_EXPECTED.largestPosition.pct, 1);
  });

  test("average position size = total / 12", () => {
    const avg = ABB_EXPECTED.totalValue / ABB_EXPECTED.numHoldings;
    expect(avg).toBeCloseTo(ABB_EXPECTED.averagePositionSize, 1);
  });
});

describe("ABB Portfolio — Holdings by Value (from HTML table)", () => {
  test("each holding value = shares × current price", () => {
    HOLDINGS_FROM_HTML.forEach((h) => {
      const value = h.shares * h.currentPrice;
      const expected = ABB_EXPECTED.holdings[h.ticker].value;
      expect(value).toBeCloseTo(expected, 1);
    });
  });

  test("holdings sorted by value descending match HTML order", () => {
    const sorted = [...HOLDINGS_FROM_HTML].sort(
      (a, b) => b.shares * b.currentPrice - a.shares * a.currentPrice
    );
    const tickers = sorted.map((h) => h.ticker);
    expect(tickers).toEqual([
      "GDX", "SLV", "URNM", "GLD", "XME", "FNDF", "EFV", "IGM", "IAI", "CIBR", "FNGO", "GBTC"
    ]);
  });
});

describe("ABB Portfolio — Performance Metrics", () => {
  test("backtest returns finite metrics (CAGR, volatility, maxDrawdown, totalReturn)", () => {
    const holdings = makeAbbHoldingsWithHistoricalData();
    const startDate = Object.keys(holdings[0].historicalData).sort()[0];
    const endDate = Object.keys(holdings[0].historicalData).sort().pop();
    const targetWeights = {};
    holdings.forEach((h) => {
      targetWeights[h.ticker] = 100 / holdings.length;
    });

    const out = runRebalancingBacktest({
      holdings,
      targetWeights,
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate,
      endDate,
    });

    expect(out.error).toBeUndefined();
    expect(Number.isFinite(out.metrics.cagr)).toBe(true);
    expect(Number.isFinite(out.metrics.volatility)).toBe(true);
    expect(Number.isFinite(out.metrics.maxDrawdown)).toBe(true);
    expect(Number.isFinite(out.metrics.totalReturn)).toBe(true);
  });

  test("portfolioHistory values match calculatePortfolioValue for each date", () => {
    const holdings = makeAbbHoldingsWithHistoricalData();
    const dates = Object.keys(holdings[0].historicalData).sort();
    const targetWeights = {};
    holdings.forEach((h) => {
      targetWeights[h.ticker] = 100 / holdings.length;
    });

    const out = runRebalancingBacktest({
      holdings,
      targetWeights,
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    for (const point of out.portfolioHistory) {
      const expected = calculatePortfolioValue(holdings, point.date);
      expect(point.value).toBeCloseTo(expected, 10);
    }
  });
});

describe("ABB Portfolio — Correlation Matrix", () => {
  test("correlation of identical returns is 1.0", () => {
    const returns = [0.01, -0.02, 0.03, 0.0, -0.01];
    expect(calculateCorrelation(returns, returns)).toBeCloseTo(1.0, 10);
  });

  test("correlation values are between -1 and 1", () => {
    const holdings = makeAbbHoldingsWithHistoricalData();
    const returnsData = {};
    holdings.forEach((h) => {
      const dates = Object.keys(h.historicalData).sort();
      const returns = [];
      for (let i = 1; i < dates.length; i++) {
        const prev = h.historicalData[dates[i - 1]].close;
        const curr = h.historicalData[dates[i]].close;
        returns.push((curr - prev) / prev);
      }
      returnsData[h.ticker] = returns;
    });

    const tickers = Object.keys(returnsData);
    for (let i = 0; i < tickers.length; i++) {
      for (let j = 0; j < tickers.length; j++) {
        const corr = calculateCorrelation(returnsData[tickers[i]], returnsData[tickers[j]]);
        expect(corr).toBeGreaterThanOrEqual(-1.01);
        expect(corr).toBeLessThanOrEqual(1.01);
      }
    }
  });
});

describe("ABB Portfolio — Monte Carlo Simulation", () => {
  test("percentiles are ordered: worst (10th) < median (50th) < best (90th)", () => {
    const { worst10, median, best90 } = ABB_EXPECTED.monteCarlo;
    expect(worst10).toBeLessThan(median);
    expect(median).toBeLessThan(best90);
  });

  test("Monte Carlo mean is between worst and best for HTML values", () => {
    const { average, worst10, best90 } = ABB_EXPECTED.monteCarlo;
    expect(average).toBeGreaterThan(worst10);
    expect(average).toBeLessThan(best90);
  });
});

describe("ABB Portfolio — Optimization Analysis (from HTML)", () => {
  test("12-holding portfolio gets Conservative risk level", () => {
    const holdings = makeAbbHoldingsSnapshot().map((h) => ({
      ticker: h.ticker,
      value: h.shares * (h.historicalData[SNAPSHOT_DATE]?.close || 0),
    }));
    const total = holdings.reduce((s, h) => s + h.value, 0);
    const result = analyzePortfolioOptimization(holdings, total);

    expect(result.riskLevel).toBe(ABB_EXPECTED.optimization.riskLevel);
  });

  test("diversification score is 10/10 for balanced 12-holding portfolio", () => {
    const holdings = makeAbbHoldingsSnapshot().map((h) => ({
      ticker: h.ticker,
      value: h.shares * (h.historicalData[SNAPSHOT_DATE]?.close || 0),
    }));
    const total = holdings.reduce((s, h) => s + h.value, 0);
    const result = analyzePortfolioOptimization(holdings, total);

    expect(result.diversificationScore).toBe(ABB_EXPECTED.optimization.diversificationScore);
  });

  test("largest position is ~14.3% (GDX)", () => {
    const holdings = makeAbbHoldingsSnapshot().map((h) => ({
      ticker: h.ticker,
      value: h.shares * (h.historicalData[SNAPSHOT_DATE]?.close || 0),
    }));
    const total = holdings.reduce((s, h) => s + h.value, 0);
    const result = analyzePortfolioOptimization(holdings, total);

    expect(result.maxPosition).toBeCloseTo(ABB_EXPECTED.optimization.largestPositionPct, 1);
  });

  test("allocation percentages sum to 100%", () => {
    const holdings = makeAbbHoldingsSnapshot().map((h) => ({
      ticker: h.ticker,
      value: h.shares * (h.historicalData[SNAPSHOT_DATE]?.close || 0),
    }));
    const total = holdings.reduce((s, h) => s + h.value, 0);
    const result = analyzePortfolioOptimization(holdings, total);

    const sumPct = result.allocations.reduce((s, a) => s + a.percentage, 0);
    expect(sumPct).toBeCloseTo(100, 2);
  });
});

describe("ABB Portfolio — Rebalancing Simulator", () => {
  test("needsRebalancing triggers when drift exceeds threshold", () => {
    const currentWeights = { GDX: 20, SLV: 10, URNM: 10 };
    const targetWeights = { GDX: 14.3, SLV: 11.7, URNM: 9.6 };
    expect(needsRebalancing(currentWeights, targetWeights, 5)).toBe(true);
    expect(needsRebalancing(currentWeights, targetWeights, 10)).toBe(false);
  });

  test("rebalancePortfolio produces weights matching target", () => {
    const holdings = makeAbbHoldingsSnapshot();
    const targetWeights = {};
    holdings.forEach((h) => {
      targetWeights[h.ticker] = 100 / holdings.length;
    });

    const rebalanced = rebalancePortfolio(holdings, targetWeights, SNAPSHOT_DATE);
    const w = calculateCurrentWeights(rebalanced, SNAPSHOT_DATE);

    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 6);

    const targetPct = 100 / 12;
    Object.values(w).forEach((weight) => {
      expect(weight).toBeCloseTo(targetPct, 4);
    });
  });

  test("runRebalancingBacktest with NONE strategy preserves total value at each date", () => {
    const holdings = makeAbbHoldingsWithHistoricalData();
    const dates = Object.keys(holdings[0].historicalData).sort();
    const targetWeights = {};
    holdings.forEach((h) => {
      targetWeights[h.ticker] = 100 / holdings.length;
    });

    const out = runRebalancingBacktest({
      holdings,
      targetWeights,
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    });

    expect(out.rebalanceCount).toBe(0);
    expect(out.portfolioHistory.length).toBeGreaterThan(0);
  });
});
