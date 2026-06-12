import { saveTreasurySnapshot } from '../lib/history.js';

const VERSION = '1.0.0';

const isStellarPublicKey = (value) => /^G[A-Z2-7]{55}$/.test(value);
const isSorobanContractId = (value) => /^C[A-Z2-7]{55}$/.test(value);
const normalizeInputList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

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

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'POST') {
    return errorResponse(res, 405, 'Method not allowed', 'Use POST');
  }

  const body = parseBody(req);
  const wallets = normalizeInputList(body.wallets);
  const contracts = normalizeInputList(body.contracts);

  if (wallets.length === 0) {
    return errorResponse(res, 400, 'At least one wallet is required', 'wallets must be an array or comma-separated string');
  }

  const malformedWallets = wallets.filter((wallet) => !isStellarPublicKey(wallet));
  if (malformedWallets.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid wallets',
      `Malformed Stellar public wallet address${malformedWallets.length === 1 ? '' : 'es'}: ${malformedWallets.join(', ')}`
    );
  }

  const malformedContracts = contracts.filter((contractId) => !isSorobanContractId(contractId));
  if (malformedContracts.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid contracts',
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
        aggregateData?.message || 'Unable to create snapshot from aggregate data'
      );
    }

    let savedSnapshot;
    try {
      savedSnapshot = await saveTreasurySnapshot({ wallets, contracts, aggregateResult: aggregateData });
    } catch (error) {
      setCommonHeaders(res);
      return res.status(200).json({
        success: true,
        saved: false,
        warning: 'Snapshot storage unavailable',
        message: error.message,
        snapshot: {
          timestamp: new Date().toISOString(),
          wallets,
          contracts,
          totalUSD: aggregateData.totalUSD || 0,
          totalXLM: aggregateData.totalXLM || 0,
          assets: Array.isArray(aggregateData.assets) ? aggregateData.assets : [],
          pricedAssets: Array.isArray(aggregateData.pricedAssets) ? aggregateData.pricedAssets : [],
          unpricedAssets: Array.isArray(aggregateData.unpricedAssets) ? aggregateData.unpricedAssets : [],
          errors: Array.isArray(aggregateData.errors) ? aggregateData.errors : []
        }
      });
    }

    setCommonHeaders(res);
    return res.status(200).json({
      success: true,
      saved: savedSnapshot.saved,
      historyKey: savedSnapshot.historyKey,
      storage: savedSnapshot.storage,
      ...(savedSnapshot.warning ? { warning: savedSnapshot.warning } : {}),
      snapshot: savedSnapshot.snapshot
    });
  } catch (error) {
    return errorResponse(res, 500, 'Snapshot creation failed', error.message);
  }
}
