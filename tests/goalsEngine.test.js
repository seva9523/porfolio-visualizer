const {
  runGoalMonteCarloSimulation,
  calculateDeterministicProjection,
  calculateRequiredContribution,
} = require("../goals-engine");

describe("Goals Engine — correctness & sanity", () => {
  test("Deterministic projection matches the same math as FV formula", () => {
    const initial = 10000;
    const monthly = 200;
    const annualReturn = 0.06;
    const years = 10;

    const out = calculateDeterministicProjection(initial, monthly, annualReturn, years);

    const r = annualReturn / 12;
    const n = years * 12;
    const expected =
      initial * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);

    expect(out).toBeCloseTo(expected, 10);
  });

  test("Required contribution is zero if you already have enough (given return)", () => {
    const currentSavings = 200000;
    const target = 100000;
    const annualReturn = 0.05;
    const years = 10;

    const req = calculateRequiredContribution(currentSavings, target, annualReturn, years);
    expect(req).toBe(0);
  });

  test("Required contribution produces a projection close to target (within rounding)", () => {
    const currentSavings = 10000;
    const target = 200000;
    const annualReturn = 0.06;
    const years = 15;

    const req = calculateRequiredContribution(currentSavings, target, annualReturn, years);
    expect(req).toBeGreaterThan(0);

    const projected = calculateDeterministicProjection(currentSavings, req, annualReturn, years);

    // allow small tolerance due to floating point
    expect(projected).toBeGreaterThan(target * 0.999);
    expect(projected).toBeLessThan(target * 1.001);
  });

  test("Monte Carlo output shape is sane and within bounds (small sim count for speed)", () => {
    const result = runGoalMonteCarloSimulation({
      currentSavings: 10000,
      monthlyContribution: 200,
      annualReturn: 0.06,
      annualVolatility: 0.12,
      years: 10,
      targetAmount: 50000,
      numSimulations: 300, // keep tests fast
    });

    // basic bounds
    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfSuccess).toBeLessThanOrEqual(100);

    // percentiles should be ordered
    expect(result.percentile10).toBeLessThanOrEqual(result.medianValue);
    expect(result.medianValue).toBeLessThanOrEqual(result.percentile90);

    // baseline should be finite
    expect(Number.isFinite(result.baselineValue)).toBe(true);

    // finalValues list length equals numSimulations
    expect(Array.isArray(result.finalValues)).toBe(true);
    expect(result.finalValues.length).toBe(300);

    // sample paths: stored every 100th sim (0, 100, 200) => 3 paths here
    expect(Array.isArray(result.simulationPaths)).toBe(true);
    expect(result.simulationPaths.length).toBe(3);

    // each path stores yearly values: start + each year end => years + 1
    for (const path of result.simulationPaths) {
      expect(path.length).toBe(10 + 1);
      for (const v of path) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
