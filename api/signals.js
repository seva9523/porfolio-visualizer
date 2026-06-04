import { generateTreasurySignals, toSignalsApiPayload } from './_treasurySignals.js';

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

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed', 'Use GET');
  }

  const walletsParam = Array.isArray(req.query.wallets) ? req.query.wallets.join(',') : req.query.wallets;
  const contractsParam = Array.isArray(req.query.contracts) ? req.query.contracts.join(',') : req.query.contracts;
  if (!walletsParam || typeof walletsParam !== 'string') {
    return errorResponse(
      res,
      400,
      'Missing wallets query param',
      'Use /api/signals?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4'
    );
  }

  const wallets = walletsParam.split(',').map((wallet) => wallet.trim()).filter(Boolean);
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

  const contracts = (contractsParam || '').split(',').map((contractId) => contractId.trim()).filter(Boolean);
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
  try {
    const aggregateUrl = new URL('/api/aggregate', getBaseUrl(req));
    aggregateUrl.searchParams.set('wallets', wallets.join(','));

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
        aggregateData?.message || 'Unable to generate treasury signals from aggregate data'
      );
    }

    const signals = toSignalsApiPayload(generateTreasurySignals(aggregateData));

    setCommonHeaders(res);
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      walletCount: aggregateData.walletCount || wallets.length,
      ...(contracts.length > 0 ? { contracts } : {}),
      signals
    });
  } catch (error) {
    return errorResponse(res, 500, 'Signals generation failed', error.message);
  }
}
