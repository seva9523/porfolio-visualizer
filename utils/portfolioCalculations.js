// utils/portfolioCalculations.js
function calculateExpectedReturn(portfolio) {
  return portfolio.reduce((acc, asset) => acc + asset.weight * asset.expectedReturn, 0);
}

function calculateFutureValue(currentSavings, monthlyContribution, annualReturn, years) {
  const r = annualReturn / 12;
  const n = years * 12;

  if (r === 0) return currentSavings + monthlyContribution * n;

  return (
    currentSavings * Math.pow(1 + r, n) +
    monthlyContribution * ((Math.pow(1 + r, n) - 1) / r)
  );
}

module.exports = {
  calculateExpectedReturn,
  calculateFutureValue,
};
