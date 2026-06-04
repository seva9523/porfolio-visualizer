const ASSET_TO_COINGECKO = {
  XLM: 'stellar',
  USDZ: 'usdz'
};

const CONTRACT_TO_COINGECKO = {};

const VERSION = '1.0.0';
const CACHE_TTL_MS = 60 * 1000;
const cache = globalThis.__wealthviewCache || new Map();
globalThis.__wealthviewCache = cache;

const normalizeAssetCode = (code) => (code || '').trim().toUpperCase();
const normalizeQueryParam = (value) => (Array.isArray(value) ? value.join(',') : value);
const parseCsvParam = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const isStellarPublicKey = (value) => /^G[A-Z2-7]{55}$/.test(value);
const isSorobanContractId = (value) => /^C[A-Z2-7]{55}$/.test(value);
const nowIso = () => new Date().toISOString();

function setCommonHeaders(res, cacheStatus) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-WealthView-Version', VERSION);
  res.setHeader('X-Cache-Status', cacheStatus);
}

function errorResponse(res, status, cacheStatus, error, message) {
  setCommonHeaders(res, cacheStatus);
  return res.status(status).json({ success: false, error, message });
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return errorResponse(res, 405, 'MISS', 'Method not allowed', 'Use GET');
  }

  const walletsParam = normalizeQueryParam(req.query.wallets);
  if (!walletsParam || typeof walletsParam !== 'string') {
    return errorResponse(
      res,
      400,
      'MISS',
      'Missing wallets query param',
      'Use /api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4'
    );
  }

  const wallets = parseCsvParam(walletsParam);
  if (wallets.length === 0) {
    return errorResponse(res, 400, 'MISS', 'At least one wallet is required', 'wallets query param is empty');
  }

  const malformedWallets = wallets.filter((wallet) => !isStellarPublicKey(wallet));
  if (malformedWallets.length > 0) {
    return errorResponse(
      res,
      400,
      'MISS',
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
      'MISS',
      'Invalid contracts query param',
      `Malformed Soroban contract ID${malformedContracts.length === 1 ? '' : 's'}: ${malformedContracts.join(', ')}`
    );
  }

  const cacheKey = `${wallets.join(',')}|contracts:${contracts.join(',')}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    setCommonHeaders(res, 'HIT');
    return res.status(200).json(hit.payload);
  }

  try {
    const allBalances = [];
    const errors = [];

    for (const addr of wallets) {
      const accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
      if (!accountRes.ok) {
        errors.push({ wallet: addr, message: `Horizon returned ${accountRes.status}` });
        continue;
      }
      const data = await accountRes.json();
      (data.balances || []).forEach((b) => {
        const isNative = b.asset_type === 'native';
        const symbol = isNative ? 'XLM' : normalizeAssetCode(b.asset_code || 'UNKNOWN');
        const amount = parseFloat(b.balance) || 0;
        allBalances.push({ symbol, amount });
      });
    }

    contracts.forEach((contractId) => {
      errors.push({
        contractId,
        message: 'SEP-41 contract querying requires Soroban RPC implementation; contract ID was validated but not queried.'
      });
    });

    const symbols = [...new Set(allBalances.map((b) => b.symbol))];
    const geckoIds = [
      ...new Set([
        ...symbols.map((s) => ASSET_TO_COINGECKO[s]),
        ...contracts.map((contractId) => CONTRACT_TO_COINGECKO[contractId])
      ].filter(Boolean))
    ];

    let priceMap = {};
    if (geckoIds.length > 0) {
      const ids = geckoIds.join(',');
      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`);
      if (!priceRes.ok) {
        return errorResponse(res, 502, 'MISS', 'Pricing API failed', 'Unable to fetch CoinGecko prices');
      }
      priceMap = await priceRes.json();
    }

    const assetsBySymbol = {};
    let totalXLM = 0;
    let totalUSD = 0;
    const pricedAssets = [];
    const unpricedAssets = [];

    allBalances.forEach(({ symbol, amount }) => {
      if (!assetsBySymbol[symbol]) assetsBySymbol[symbol] = { symbol, amount: 0, usdValue: null };
      assetsBySymbol[symbol].amount += amount;
      if (symbol === 'XLM') totalXLM += amount;
    });

    Object.values(assetsBySymbol).forEach((asset) => {
      const geckoId = ASSET_TO_COINGECKO[asset.symbol];
      const usdPrice = geckoId ? priceMap?.[geckoId]?.usd : undefined;
      if (typeof usdPrice === 'number') {
        asset.usdValue = asset.amount * usdPrice;
        totalUSD += asset.usdValue;
        pricedAssets.push(asset.symbol);
      } else {
        asset.usdValue = null;
        unpricedAssets.push(asset.symbol);
      }
    });

    const assets = Object.values(assetsBySymbol)
      .map((asset) => ({
        ...asset,
        allocationPercent: asset.usdValue !== null && totalUSD > 0 ? (asset.usdValue / totalUSD) * 100 : null
      }))
      .sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));

    const payload = {
      success: true,
      timestamp: nowIso(),
      version: VERSION,
      walletCount: wallets.length,
      totalXLM,
      totalUSD,
      pricedAssets,
      unpricedAssets,
      assets,
      errors
    };

    if (contracts.length > 0) {
      payload.contracts = contracts;
      payload.sep41 = {
        supported: false,
        requestedContracts: contracts,
        message: 'SEP-41 contract IDs are accepted and validated, but live Soroban RPC balance querying is not enabled in this deployment yet.'
      };
    }

    cache.set(cacheKey, { at: Date.now(), payload });
    setCommonHeaders(res, 'MISS');
    return res.status(200).json(payload);
  } catch (error) {
    return errorResponse(res, 500, 'MISS', 'Aggregation failed', error.message);
  }
}
