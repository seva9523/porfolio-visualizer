const ASSET_TO_COINGECKO = {
  XLM: "stellar",
  USDZ: "usdz"
};

const VERSION = "1.0.0";
const CACHE_TTL_MS = 60 * 1000;
const responseCache = new Map();

const normalizeAssetCode = (code) => (code || "").trim().toUpperCase();

function cacheKeyFromWallets(wallets) {
  return wallets.slice().sort().join(",");
}

function setInfraHeaders(res, cacheStatus) {
  res.setHeader("X-WealthView-Version", VERSION);
  res.setHeader("X-Cache-Status", cacheStatus);
}

function successPayload(payload) {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    version: VERSION,
    walletCount: payload.walletCount,
    totalXLM: payload.totalXLM,
    totalUSD: payload.totalUSD,
    pricedAssets: payload.pricedAssets,
    unpricedAssets: payload.unpricedAssets,
    assets: payload.assets,
    errors: payload.errors
  };
}

function errorPayload(error, message, details = {}) {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    version: VERSION,
    walletCount: 0,
    totalXLM: 0,
    totalUSD: 0,
    pricedAssets: [],
    unpricedAssets: [],
    assets: [],
    errors: [{ error, message, ...details }]
  };
}

export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    setInfraHeaders(res, "MISS");
    return res.status(405).json(errorPayload("Method not allowed", "Use GET"));
  }

  const walletsParam = req.query.wallets;
  if (!walletsParam || typeof walletsParam !== "string") {
    setInfraHeaders(res, "MISS");
    return res
      .status(400)
      .json(errorPayload("Missing wallets query param", "Use /api/aggregate?wallets=<wallet1>,<wallet2>"));
  }

  const wallets = walletsParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (wallets.length === 0) {
    setInfraHeaders(res, "MISS");
    return res.status(400).json(errorPayload("At least one wallet is required", "wallets query param is empty"));
  }

  const key = cacheKeyFromWallets(wallets);
  const cached = responseCache.get(key);
  const now = Date.now();

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    setInfraHeaders(res, "HIT");
    return res.status(200).json(cached.payload);
  }

  try {
    const allBalances = [];
    const errors = [];

    for (const addr of wallets) {
      const accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
      if (!accountRes.ok) {
        errors.push({ wallet: addr, error: "Wallet fetch failed", status: accountRes.status });
        continue;
      }

      const data = await accountRes.json();
      (data.balances || []).forEach((b) => {
        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : normalizeAssetCode(b.asset_code || "UNKNOWN");
        const amount = parseFloat(b.balance) || 0;
        allBalances.push({ symbol, amount });
      });
    }

    const symbols = [...new Set(allBalances.map((b) => b.symbol))];
    const geckoIds = [...new Set(symbols.map((s) => ASSET_TO_COINGECKO[s]).filter(Boolean))];

    let priceMap = {};
    if (geckoIds.length > 0) {
      const ids = geckoIds.join(",");
      const priceRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`
      );
      if (!priceRes.ok) {
        setInfraHeaders(res, "MISS");
        return res
          .status(502)
          .json(errorPayload("Pricing API failed", "Unable to fetch CoinGecko prices", { status: priceRes.status }));
      }
      priceMap = await priceRes.json();
    }

    const assetsBySymbol = {};
    let totalXLM = 0;
    let totalUSD = 0;
    const pricedAssets = [];
    const unpricedAssets = [];

    allBalances.forEach(({ symbol, amount }) => {
      if (!assetsBySymbol[symbol]) {
        assetsBySymbol[symbol] = { symbol, amount: 0, usdValue: null };
      }
      assetsBySymbol[symbol].amount += amount;
      if (symbol === "XLM") totalXLM += amount;
    });

    Object.values(assetsBySymbol).forEach((asset) => {
      const geckoId = ASSET_TO_COINGECKO[asset.symbol];
      const usdPrice = geckoId ? priceMap?.[geckoId]?.usd : undefined;

      if (typeof usdPrice === "number") {
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

    const payload = successPayload({
      walletCount: wallets.length,
      totalXLM,
      totalUSD,
      pricedAssets,
      unpricedAssets,
      assets,
      errors
    });

    responseCache.set(key, { cachedAt: now, payload });

    setInfraHeaders(res, "MISS");
    return res.status(200).json(payload);
  } catch (error) {
    setInfraHeaders(res, "MISS");
    return res.status(500).json(errorPayload("Aggregation failed", error.message));
  }
}
