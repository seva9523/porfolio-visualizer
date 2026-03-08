// tests/portfolioOptimization.test.js
// ============================================================================
// QA: PORTFOLIO OPTIMIZATION — RISK LEVELS & DIVERSIFICATION SCORING
// ============================================================================

const { analyzePortfolioOptimization } = require("../utils/portfolioOptimization");

describe("QA: Portfolio Optimization — Risk Classification", () => {
  test("PV-012: Single holding = Aggressive risk", () => {
    const holdings = [{ ticker: "AAPL", value: 10000 }];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.riskLevel).toBe("Aggressive");
  });

  test("PV-012: Two holdings = Aggressive (< 3)", () => {
    const holdings = [
      { ticker: "AAPL", value: 6000 },
      { ticker: "GOOGL", value: 4000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.riskLevel).toBe("Aggressive");
  });

  test("PV-012: One holding > 50% with others = Aggressive", () => {
    const holdings = [
      { ticker: "AAPL", value: 6000 },
      { ticker: "GOOGL", value: 1500 },
      { ticker: "MSFT", value: 1500 },
      { ticker: "AMZN", value: 1000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.riskLevel).toBe("Aggressive");
    expect(result.maxPosition).toBe(60);
  });

  test("PV-012: Well-diversified portfolio = Conservative", () => {
    const holdings = [
      { ticker: "VTI", value: 2000 },
      { ticker: "VXUS", value: 2000 },
      { ticker: "BND", value: 2000 },
      { ticker: "GLD", value: 1500 },
      { ticker: "VNQ", value: 1500 },
      { ticker: "TIP", value: 1000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.riskLevel).toBe("Conservative");
  });

  test("Empty portfolio returns null", () => {
    expect(analyzePortfolioOptimization([], 0)).toBeNull();
  });
});

describe("QA: Portfolio Optimization — Diversification Score", () => {
  test("PV-012: Perfectly balanced 10-holding portfolio scores high", () => {
    const holdings = [];
    for (let i = 0; i < 10; i++) {
      holdings.push({ ticker: `T${i}`, value: 1000 });
    }
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.diversificationScore).toBeGreaterThanOrEqual(7);
  });

  test("PV-012: Single holding scores very low", () => {
    const holdings = [{ ticker: "AAPL", value: 10000 }];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.diversificationScore).toBeLessThanOrEqual(3);
  });

  test("PV-010: Allocations sum to ~100%", () => {
    const holdings = [
      { ticker: "VTI", value: 5000 },
      { ticker: "BND", value: 3000 },
      { ticker: "GLD", value: 2000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    const sum = result.allocations.reduce((s, a) => s + a.percentage, 0);
    expect(sum).toBeCloseTo(100, 5);
  });

  test("PV-010: Allocations sorted descending by percentage", () => {
    const holdings = [
      { ticker: "BND", value: 2000 },
      { ticker: "VTI", value: 6000 },
      { ticker: "GLD", value: 2000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    for (let i = 1; i < result.allocations.length; i++) {
      expect(result.allocations[i].percentage).toBeLessThanOrEqual(
        result.allocations[i - 1].percentage
      );
    }
  });

  test("Top 3 concentration calculated correctly", () => {
    const holdings = [
      { ticker: "A", value: 4000 },
      { ticker: "B", value: 3000 },
      { ticker: "C", value: 2000 },
      { ticker: "D", value: 1000 },
    ];
    const result = analyzePortfolioOptimization(holdings, 10000);
    expect(result.top3Concentration).toBeCloseTo(90, 5); // 40+30+20
  });
});
