const {
  calculatePortfolioValue,
  calculateCurrentWeights,
} = require("../rebalancing-engine");

describe("Your portfolio — today snapshot accuracy", () => {
  test("portfolio total value and weights are correct using provided shares + current prices", () => {
    const asOfDate = "TODAY"; // just a label string for our mock historicalData

    // Your exact holdings with exact shares and today's prices as the close price
    const holdings = [
      { ticker: "XME",  shares: 11.87, historicalData: { [asOfDate]: { close: 116 } } },
      { ticker: "URNM", shares: 21.40, historicalData: { [asOfDate]: { close: 73 } } },

      { ticker: "FNDF", shares: 26.80, historicalData: { [asOfDate]: { close: 51.43 } } },
      { ticker: "SLV",  shares: 24.97, historicalData: { [asOfDate]: { close: 72 } } },
      { ticker: "EFV",  shares: 17.12, historicalData: { [asOfDate]: { close: 79 } } },
      { ticker: "GLD",  shares: 3.00,  historicalData: { [asOfDate]: { close: 462 } } },

      { ticker: "GBTC", shares: 13.00, historicalData: { [asOfDate]: { close: 52 } } },
      { ticker: "FNGO", shares: 10.00, historicalData: { [asOfDate]: { close: 92 } } },
      { ticker: "IGM",  shares: 10.00, historicalData: { [asOfDate]: { close: 124 } } },
      { ticker: "IAI",  shares: 6.00,  historicalData: { [asOfDate]: { close: 171 } } },
    ];

    // 1) Total value check
    const total = calculatePortfolioValue(holdings, asOfDate);

    // Expected total from your numbers:
    // XME 1376.92
    // URNM 1562.20
    // FNDF 1378.324
    // SLV 1797.84
    // EFV 1352.48
    // GLD 1386
    // GBTC 676
    // FNGO 920
    // IGM 1240
    // IAI 1026
    // Total = 12715.764  -> rounded to 12715.76
    expect(total).toBeCloseTo(12715.76, 2);

    // 2) Weight checks
    const w = calculateCurrentWeights(holdings, asOfDate);

    // weights should add to 100
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(99.99);
    expect(sum).toBeLessThan(100.01);

    // each weight should be close to what the math implies
    // (we allow small tolerance because your engine might round weights)
    expect(w.XME).toBeCloseTo((1376.92 / 12715.76) * 100, 2);
    expect(w.URNM).toBeCloseTo((1562.20 / 12715.76) * 100, 2);
    expect(w.FNDF).toBeCloseTo((1378.32 / 12715.76) * 100, 2);
    expect(w.SLV).toBeCloseTo((1797.84 / 12715.76) * 100, 2);
    expect(w.EFV).toBeCloseTo((1352.48 / 12715.76) * 100, 2);
    expect(w.GLD).toBeCloseTo((1386.00 / 12715.76) * 100, 2);
    expect(w.GBTC).toBeCloseTo((676.00 / 12715.76) * 100, 2);
    expect(w.FNGO).toBeCloseTo((920.00 / 12715.76) * 100, 2);
    expect(w.IGM).toBeCloseTo((1240.00 / 12715.76) * 100, 2);
    expect(w.IAI).toBeCloseTo((1026.00 / 12715.76) * 100, 2);

    // 3) No broken numbers
    for (const val of [total, ...Object.values(w)]) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });
});
