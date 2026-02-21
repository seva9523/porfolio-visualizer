/**
 * ABB Portfolio Fixture — Extracted from saved HTML page (wealthview.pro)
 * Real portfolio data for number verification tests.
 *
 * Holdings: GDX, SLV, URNM, GLD, XME, FNDF, EFV, IGM, IAI, CIBR, FNGO, GBTC (12 holdings)
 *
 * Portfolio Summary (from HTML):
 * - Total Value: $16,324.67
 * - Total Cost Basis: $14,035.81
 * - Total Gain/Loss: $2,288.86 (+16.31%)
 *
 * Performance Metrics:
 * - CAGR: 29.79%
 * - Sharpe Ratio: 0.82
 * - Max Drawdown: 75.52%
 * - Volatility: 40.16%
 *
 * Monte Carlo (10-year, $16,325 initial):
 * - Average: $548,195
 * - Median (50th): $233,151
 * - Best (90th): $1,236,986
 * - Worst (10th): $48,134
 *
 * Optimization:
 * - Risk Level: Conservative
 * - Diversification Score: 10/10
 * - Largest Position: GDX 14.3%
 */

const SNAPSHOT_DATE = "2026-02-21";

const HOLDINGS_FROM_HTML = [
  { ticker: "GDX", shares: 22, purchasePrice: 53.96, currentPrice: 106.26, purchaseDate: "2025-07-25" },
  { ticker: "SLV", shares: 24.97, purchasePrice: 48.4, currentPrice: 76.62, purchaseDate: "2025-11-26" },
  { ticker: "URNM", shares: 21.4, purchasePrice: 55.16, currentPrice: 73.49, purchaseDate: "2025-12-15" },
  { ticker: "GLD", shares: 3, purchasePrice: 383.12, currentPrice: 468.62, purchaseDate: "2025-11-26" },
  { ticker: "XME", shares: 11.87, purchasePrice: 100.85, currentPrice: 117.46, purchaseDate: "2025-12-15" },
  { ticker: "FNDF", shares: 26.8, purchasePrice: 44.81, currentPrice: 51.84, purchaseDate: "2025-11-26" },
  { ticker: "EFV", shares: 17.12, purchasePrice: 70.08, currentPrice: 79.13, purchaseDate: "2025-11-26" },
  { ticker: "IGM", shares: 10, purchasePrice: 115.19, currentPrice: 125.29, purchaseDate: "2025-07-25" },
  { ticker: "IAI", shares: 6, purchasePrice: 175.82, currentPrice: 172.04, purchaseDate: "2025-07-25" },
  { ticker: "CIBR", shares: 16, purchasePrice: 74.66, currentPrice: 63.9, purchaseDate: "2025-07-25" },
  { ticker: "FNGO", shares: 10, purchasePrice: 111.69, currentPrice: 96.29, purchaseDate: "2025-07-25" },
  { ticker: "GBTC", shares: 13, purchasePrice: 91.87, currentPrice: 52.81, purchaseDate: "2025-07-25" },
];

function makeAbbHoldingsSnapshot() {
  return HOLDINGS_FROM_HTML.map((h) => ({
    ticker: h.ticker,
    shares: h.shares,
    purchasePrice: h.purchasePrice,
    purchaseDate: h.purchaseDate,
    historicalData: { [SNAPSHOT_DATE]: { close: h.currentPrice } },
  }));
}

function makeAbbHoldingsWithHistoricalData(days = 150) {
  const holdings = makeAbbHoldingsSnapshot();
  const dates = [];
  const start = new Date("2025-07-25");
  let added = 0;
  for (let i = 0; added < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().split("T")[0]);
      added++;
    }
  }

  return holdings.map((h, idx) => {
    const basePrice = HOLDINGS_FROM_HTML[idx].currentPrice;
    const hist = {};
    let price = basePrice;
    dates.forEach((date, i) => {
      price = price * (1 + (Math.sin(i + idx * 10) * 0.01));
      hist[date] = { close: Math.round(price * 100) / 100 };
    });
    return { ...h, historicalData: hist };
  });
}

const ABB_EXPECTED = {
  totalValue: 16324.67,
  totalCostBasis: 14035.81,
  totalGainLoss: 2288.86,
  gainLossPercent: 16.31,
  numHoldings: 12,
  largestPosition: { ticker: "GDX", pct: 14.3 },
  averagePositionSize: 1360.39,
  holdings: {
    GDX: { value: 2337.72, costBasis: 1187.12, allocation: 14.32 },
    SLV: { value: 1913.2, costBasis: 1208.55, allocation: 11.72 },
    URNM: { value: 1572.69, costBasis: 1180.42, allocation: 9.63 },
    GLD: { value: 1405.86, costBasis: 1149.36, allocation: 8.61 },
    XME: { value: 1394.25, costBasis: 1197.09, allocation: 8.54 },
    FNDF: { value: 1389.31, costBasis: 1200.91, allocation: 8.51 },
    EFV: { value: 1354.71, costBasis: 1199.77, allocation: 8.3 },
    IGM: { value: 1252.9, costBasis: 1151.9, allocation: 7.67 },
    IAI: { value: 1032.24, costBasis: 1054.92, allocation: 6.32 },
    CIBR: { value: 1022.4, costBasis: 1194.56, allocation: 6.26 },
    FNGO: { value: 962.87, costBasis: 1116.9, allocation: 5.9 },
    GBTC: { value: 686.53, costBasis: 1194.31, allocation: 4.21 },
  },
  performance: {
    cagr: 29.79,
    sharpeRatio: 0.82,
    maxDrawdown: 75.52,
    volatility: 40.16,
  },
  monteCarlo: {
    average: 548195,
    median: 233151,
    best90: 1236986,
    worst10: 48134,
  },
  optimization: {
    riskLevel: "Conservative",
    diversificationScore: 10,
    largestPositionPct: 14.3,
  },
  snapshotDate: SNAPSHOT_DATE,
};

module.exports = {
  makeAbbHoldingsSnapshot,
  makeAbbHoldingsWithHistoricalData,
  ABB_EXPECTED,
  HOLDINGS_FROM_HTML,
  SNAPSHOT_DATE,
};
