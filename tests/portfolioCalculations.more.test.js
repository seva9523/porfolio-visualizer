const {
  calculateExpectedReturn,
  calculateFutureValue,
} = require("../utils/portfolioCalculations");

describe("Portfolio Calculations — stronger correctness tests", () => {
  test("Expected return weights sum to 1 gives correct weighted average", () => {
    const portfolio = [
      { weight: 0.7, expectedReturn: 0.08 },
      { weight: 0.3, expectedReturn: 0.02 },
    ];
    expect(calculateExpectedReturn(portfolio)).toBeCloseTo(0.062, 12);
  });

  test("Future value: zero return is purely initial + contributions", () => {
    const fv = calculateFutureValue(10000, 100, 0, 5);
    // 5 years * 12 months = 60 months
    expect(fv).toBeCloseTo(10000 + 100 * 60, 12);
  });

  test("Future value: matches known formula when contributions are zero", () => {
    const currentSavings = 50000;
    const monthlyContribution = 0;
    const annualReturn = 0.06;
    const years = 10;

    const fv = calculateFutureValue(currentSavings, monthlyContribution, annualReturn, years);

    const expected = currentSavings * Math.pow(1 + annualReturn / 12, years * 12);
    expect(fv).toBeCloseTo(expected, 10);
  });

  test("More contribution => ending value must not go down", () => {
    const base = calculateFutureValue(20000, 200, 0.05, 20);
    const more = calculateFutureValue(20000, 300, 0.05, 20);
    expect(more).toBeGreaterThan(base);
  });

  test("Higher return => ending value must not go down", () => {
    const low = calculateFutureValue(20000, 200, 0.03, 20);
    const high = calculateFutureValue(20000, 200, 0.06, 20);
    expect(high).toBeGreaterThan(low);
  });

  test("Negative return still produces a finite number", () => {
    const fv = calculateFutureValue(20000, 200, -0.2, 10);
    expect(Number.isFinite(fv)).toBe(true);
  });
});
