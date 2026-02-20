const {
  REBALANCING_STRATEGIES,
  calculatePortfolioValue,
  calculateCurrentWeights,
  runRebalancingBacktest,
} = require("../rebalancing-engine");

/**
 * Your portfolio transactions:
 * - 2025-07-25: GBTC 1183, FNGO 1119, IGM 1153, IAI 1052
 * - 2025-11-26: FNDF 1200, SLV 1200, EFV 1200, GLD 1149
 * - 2025-12-15: XME 1201, URNM 1200
 *
 * This test uses deterministic mock prices so results are stable and testable.
 * It verifies that the engine math + chart data are consistent for this scenario.
 */

// Simple helper: create a deterministic "close price" for each date
function priceFor(ticker, date) {
  // A predictable (but fake) price rule:
  // base per ticker + small drift by month/day
  const base = {
    GBTC: 60,
    FNGO: 90,
    IGM: 100,
    IAI: 70,
    FNDF: 40,
    SLV: 30,
    EFV: 50,
    GLD: 80,
    XME: 55,
    URNM: 65,
  }[ticker];

  // turn date into a small integer drift
  const [y, m, d] = date.split("-").map(Number);
  const drift = (m * 0.6) + (d * 0.1); // small drift across dates
  return +(base + drift).toFixed(2);
}

// Build mock historicalData for each ticker for a fixed set of "trading dates"
function buildHistoricalData(ticker, dates) {
  const out = {};
  for (const date of dates) {
    out[date] = { close: priceFor(ticker, date) };
  }
  return out;
}

// Convert “USD bought” into shares using price on the purchase date
function sharesFromUsd(ticker, usd, purchaseDate) {
  const px = priceFor(ticker, purchaseDate);
  return usd / px;
}

describe("Your portfolio scenario — chart + math consistency", () => {
  test("portfolioHistory matches direct valuation and weights sum to ~100%", () => {
    const tradingDates = [
      // include the key purchase dates + a couple of later dates
      "2025-07-25",
      "2025-07-28",
      "2025-11-26",
      "2025-11-27",
      "2025-12-15",
      "2025-12-16",
    ];

    const purchases = [
      // 25 July 2025
      { date: "2025-07-25", ticker: "GBTC", usd: 1183 },
      { date: "2025-07-25", ticker: "FNGO", usd: 1119 },
      { date: "2025-07-25", ticker: "IGM", usd: 1153 },
      { date: "2025-07-25", ticker: "IAI", usd: 1052 },

      // 26 Nov 2025
      { date: "2025-11-26", ticker: "FNDF", usd: 1200 },
      { date: "2025-11-26", ticker: "SLV", usd: 1200 },
      { date: "2025-11-26", ticker: "EFV", usd: 1200 },
      { date: "2025-11-26", ticker: "GLD", usd: 1149 },

      // 15 Dec 2025
      { date: "2025-12-15", ticker: "XME", usd: 1201 },
      { date: "2025-12-15", ticker: "URNM", usd: 1200 },
    ];

    // We’ll assume you hold everything from first purchase onward (no selling).
    // Holdings shares = sum of shares bought across all buys.
    const tickers = [...new Set(purchases.map(p => p.ticker))];

    const holdings = tickers.map(ticker => {
      const totalShares = purchases
        .filter(p => p.ticker === ticker)
        .reduce((acc, p) => acc + sharesFromUsd(ticker, p.usd, p.date), 0);

      return {
        ticker,
        shares: totalShares,
        historicalData: buildHistoricalData(ticker, tradingDates),
      };
    });

    const out = runRebalancingBacktest({
      holdings,
      targetWeights: Object.fromEntries(tickers.map(t => [t, 100 / tickers.length])), // equal-weight target just for backtest plumbing
      strategy: REBALANCING_STRATEGIES.NONE,
      startDate: tradingDates[0],
      endDate: tradingDates[tradingDates.length - 1],
    });

    expect(out.error).toBeUndefined();
    expect(out.portfolioHistory.length).toBe(tradingDates.length);

    // 1) Chart history matches direct valuation day-by-day
    for (const point of out.portfolioHistory) {
      const expected = calculatePortfolioValue(holdings, point.date);
      expect(point.value).toBeCloseTo(expected, 10);
      expect(Number.isFinite(point.value)).toBe(true);
    }

    // 2) Weights add to ~100% each day
    for (const date of tradingDates) {
      const w = calculateCurrentWeights(holdings, date);
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(99.99);
      expect(sum).toBeLessThan(100.01);
    }

    // 3) Metrics are finite numbers
    expect(Number.isFinite(out.metrics.totalReturn)).toBe(true);
    expect(Number.isFinite(out.metrics.volatility)).toBe(true);
    expect(Number.isFinite(out.metrics.maxDrawdown)).toBe(true);
    expect(Number.isFinite(out.metrics.cagr)).toBe(true);
  });
});
