// tests/portfolioCalculations.test.js
const { calculateExpectedReturn, calculateFutureValue } = require("../utils/portfolioCalculations");

describe("Portfolio Calculations Unit Tests", () => {
  test("Expected return for 2-asset portfolio", () => {
    const portfolio = [
      { weight: 0.5, expectedReturn: 0.1 },
      { weight: 0.5, expectedReturn: 0.05 },
    ];
    const result = calculateExpectedReturn(portfolio);
    expect(result).toBeCloseTo(0.075);
  });
  
test("Future value calculation with monthly contributions", () => {
  const fv = calculateFutureValue(200000, 1500, 0.065, 30);
  // This is realistically around ~3.0M with monthly compounding + contributions
  expect(fv).toBeGreaterThan(2500000);
  expect(fv).toBeLessThan(3600000);
});

test("Edge case: zero contributions", () => {
  const fv = calculateFutureValue(100000, 0, 0.05, 10);
  // Must match monthly compounding model (because the function compounds monthly)
  const expected = 100000 * Math.pow(1 + 0.05 / 12, 10 * 12);
  expect(fv).toBeCloseTo(expected, 6);
});

});
