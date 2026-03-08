// tests/correlation.test.js
// ============================================================================
// QA: CORRELATION CALCULATIONS
// ============================================================================

const { calculateCorrelation } = require("../utils/correlation");

describe("QA: Correlation — Mathematical Accuracy", () => {
  test("Perfect positive correlation = 1", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    expect(calculateCorrelation(a, b)).toBeCloseTo(1, 8);
  });

  test("Perfect negative correlation = -1", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];
    expect(calculateCorrelation(a, b)).toBeCloseTo(-1, 8);
  });

  test("Same array with itself = 1", () => {
    const a = [0.01, -0.02, 0.03, -0.01, 0.005];
    expect(calculateCorrelation(a, a)).toBeCloseTo(1, 8);
  });

  test("Zero correlation for uncorrelated data", () => {
    // Alternating patterns that cancel
    const a = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
    const b = [1, 1, -1, -1, 1, 1, -1, -1, 1, 1];
    const result = calculateCorrelation(a, b);
    expect(Math.abs(result)).toBeLessThan(0.3);
  });

  test("Result is always between -1 and 1", () => {
    const a = [0.05, -0.03, 0.02, -0.01, 0.04, 0.01, -0.02, 0.03];
    const b = [0.01, 0.02, -0.04, 0.03, -0.01, 0.02, -0.005, 0.01];
    const result = calculateCorrelation(a, b);
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });

  test("Returns 0 for arrays shorter than 2", () => {
    expect(calculateCorrelation([1], [2])).toBe(0);
    expect(calculateCorrelation([], [])).toBe(0);
  });

  test("Returns 0 for mismatched lengths", () => {
    expect(calculateCorrelation([1, 2, 3], [1, 2])).toBe(0);
  });

  test("Constant arrays produce 0 (no variance)", () => {
    const a = [5, 5, 5, 5, 5];
    const b = [3, 6, 2, 8, 4];
    expect(calculateCorrelation(a, b)).toBe(0);
  });
});
