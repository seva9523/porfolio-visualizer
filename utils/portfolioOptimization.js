/**
 * Portfolio optimization analysis logic.
 * Extracted from index.html for testability.
 */

function analyzePortfolioOptimization(holdings, total) {
  if (holdings.length === 0) return null;

  const allocations = holdings
    .map((h) => ({
      ticker: h.ticker,
      percentage: (h.value / total) * 100,
      value: h.value,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const maxPosition = allocations[0].percentage;
  const top3Concentration = allocations.slice(0, 3).reduce((sum, a) => sum + a.percentage, 0);

  let riskLevel = "";
  if (maxPosition > 50 || holdings.length < 3) {
    riskLevel = "Aggressive";
  } else if (maxPosition > 30 || holdings.length < 5) {
    riskLevel = "Moderate";
  } else {
    riskLevel = "Conservative";
  }

  let diversificationScore = 10;
  if (maxPosition > 50) diversificationScore -= 4;
  else if (maxPosition > 40) diversificationScore -= 3;
  else if (maxPosition > 30) diversificationScore -= 2;
  else if (maxPosition > 25) diversificationScore -= 1;

  if (holdings.length < 3) diversificationScore -= 3;
  else if (holdings.length < 5) diversificationScore -= 2;
  else if (holdings.length < 8) diversificationScore -= 1;

  if (top3Concentration > 80) diversificationScore -= 2;
  else if (top3Concentration > 70) diversificationScore -= 1;

  diversificationScore = Math.max(0, diversificationScore);

  return {
    allocations,
    maxPosition,
    top3Concentration,
    riskLevel,
    diversificationScore,
  };
}

module.exports = { analyzePortfolioOptimization };
