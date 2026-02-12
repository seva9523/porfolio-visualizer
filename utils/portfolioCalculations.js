// Example helper functions your tests will call

export function calculateExpectedReturn(portfolio) {
  return portfolio.reduce((acc, asset) => acc + asset.weight * asset.expectedReturn, 0);
}

export function calculateFutureValue(currentSavings, monthlyContribution, annualReturn, years) {
  const r = annualReturn / 12;
  const n = years * 12;
  return currentSavings * Math.pow(1 + r, n) +
         monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
}
