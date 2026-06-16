import { getTreasuryHistory } from '../lib/history.js';
import { generateTreasuryIntelligence } from '../lib/intelligence.js';

const VERSION = '1.0.0';

function setCommonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-WealthView-Version', VERSION);
}

function errorResponse(res, status, error, message) {
  setCommonHeaders(res);
  return res.status(status).json({ success: false, error, message });
}

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function normalizeQueryParam(value) {
  return Array.isArray(value) ? value.join(',') : value;
}

function parseCsvParam(value) {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed', 'Use GET');
  }

  const walletsParam = normalizeQueryParam(req.query.wallets);
  const contractsParam = normalizeQueryParam(req.query.contracts);
  if (!walletsParam || typeof walletsParam !== 'string') {
    return errorResponse(
      res,
      400,
      'Missing wallets query param',
      'Use /api/intelligence?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52'
    );
  }

  const wallets = parseCsvParam(walletsParam);
  if (wallets.length === 0) {
    return errorResponse(res, 400, 'At least one wallet is required', 'wallets query param is empty');
  }

  const malformedWallets = wallets.filter((wallet) => !/^G[A-Z2-7]{55}$/.test(wallet));
  if (malformedWallets.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid wallets query param',
      `Malformed Stellar public wallet address${malformedWallets.length === 1 ? '' : 'es'}: ${malformedWallets.join(', ')}`
    );
  }

  const contracts = parseCsvParam(contractsParam);
  const malformedContracts = contracts.filter((contractId) => !/^C[A-Z2-7]{55}$/.test(contractId));
  if (malformedContracts.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid contracts query param',
      `Malformed Soroban contract ID${malformedContracts.length === 1 ? '' : 's'}: ${malformedContracts.join(', ')}`
    );
  }

  try {
    const aggregateUrl = new URL('/api/aggregate', getBaseUrl(req));
    aggregateUrl.searchParams.set('wallets', wallets.join(','));
    if (contracts.length > 0) aggregateUrl.searchParams.set('contracts', contracts.join(','));

    const aggregateRes = await fetch(aggregateUrl.toString());
    let aggregateData;
    try {
      aggregateData = await aggregateRes.json();
    } catch {
      return errorResponse(res, 502, 'Aggregate API returned invalid JSON', 'Unable to parse /api/aggregate response');
    }

    if (!aggregateRes.ok || aggregateData?.success === false) {
      return errorResponse(
        res,
        aggregateRes.status || 502,
        aggregateData?.error || 'Aggregate API failed',
        aggregateData?.message || 'Unable to generate treasury intelligence from aggregate data'
      );
    }

    let previousSnapshot = null;
    let historyWarning = null;
    try {
      const history = await getTreasuryHistory({ wallets, contracts });
      previousSnapshot = Array.isArray(history.snapshots)
        ? history.snapshots.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null
        : null;
      historyWarning = history.warning || null;
    } catch (error) {
      historyWarning = error.message;
    }

    const intelligence = generateTreasuryIntelligence(aggregateData, { previousSnapshot });

    setCommonHeaders(res);
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      walletCount: aggregateData.walletCount || wallets.length,
      wallets,
      ...(contracts.length > 0 ? { contracts } : {}),
      treasuryHealth: intelligence.treasuryHealth,
      idleCapital: intelligence.idleCapital,
      alerts: intelligence.alerts,
      benchmarks: intelligence.benchmarks,
      changeDetectionAvailable: intelligence.changeDetectionAvailable,
      changeDetection: intelligence.changeDetection,
      executiveBrief: intelligence.executiveBrief,
      simulationDefaults: intelligence.simulationDefaults,
      ...(historyWarning ? { warning: historyWarning } : {})
    });
  } catch (error) {
    return errorResponse(res, 500, 'Treasury intelligence generation failed', error.message);
  }
}
