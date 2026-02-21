/**
 * Correlation calculation for portfolio holdings.
 * Extracted from index.html for testability.
 */

function calculateCorrelation(returns1, returns2) {
  if (returns1.length !== returns2.length || returns1.length < 2) return 0;

  const n = returns1.length;
  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;

  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

module.exports = { calculateCorrelation };
