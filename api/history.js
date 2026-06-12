import { getTreasuryHistory } from '../lib/history.js';

const VERSION = '1.0.0';

const normalizeQueryParam = (value) => (Array.isArray(value) ? value.join(',') : value);
const parseCsvParam = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const isStellarPublicKey = (value) => /^G[A-Z2-7]{55}$/.test(value);
const isSorobanContractId = (value) => /^C[A-Z2-7]{55}$/.test(value);

function setCommonHeaders(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-WealthView-Version', VERSION);
}

function errorResponse(res, status, error, message) {
  setCommonHeaders(res);
  return res.status(status).json({ success: false, error, message });
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return errorResponse(res, 405, 'Method not allowed', 'Use GET');
  }

  const walletsParam = normalizeQueryParam(req.query.wallets);
  if (!walletsParam || typeof walletsParam !== 'string') {
    return errorResponse(res, 400, 'Missing wallets query param', 'Use /api/history?wallets=G...');
  }

  const wallets = parseCsvParam(walletsParam);
  if (wallets.length === 0) {
    return errorResponse(res, 400, 'At least one wallet is required', 'wallets query param is empty');
  }

  const malformedWallets = wallets.filter((wallet) => !isStellarPublicKey(wallet));
  if (malformedWallets.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid wallets query param',
      `Malformed Stellar public wallet address${malformedWallets.length === 1 ? '' : 'es'}: ${malformedWallets.join(', ')}`
    );
  }

  const contractsParam = normalizeQueryParam(req.query.contracts);
  const contracts = parseCsvParam(contractsParam);
  const malformedContracts = contracts.filter((contractId) => !isSorobanContractId(contractId));
  if (malformedContracts.length > 0) {
    return errorResponse(
      res,
      400,
      'Invalid contracts query param',
      `Malformed Soroban contract ID${malformedContracts.length === 1 ? '' : 's'}: ${malformedContracts.join(', ')}`
    );
  }

  try {
    const history = await getTreasuryHistory({ wallets, contracts });
    setCommonHeaders(res);
    return res.status(200).json({
      success: true,
      wallets: history.wallets,
      contracts: history.contracts,
      historyKey: history.historyKey,
      snapshots: history.snapshots,
      count: history.count,
      storage: history.storage,
      ...(history.warning ? { warning: history.warning } : {}),
      note: 'History is snapshot-based. Configure Vercel KV / Upstash REST environment variables for durable shared storage; otherwise WealthView uses in-memory fallback storage.'
    });
  } catch (error) {
    return errorResponse(res, 500, 'History lookup failed', error.message);
  }
}
