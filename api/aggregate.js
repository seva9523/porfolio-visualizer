// WealthView API - hardened aggregate endpoint
// Runtime: Vercel Serverless Function (Node.js)

const API_VERSION = "1.1.0";
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const MAX_WALLETS = 20;
const HORIZON_TIMEOUT_MS = 8000;
const PRICE_TIMEOUT_MS = 5000;

// Simple in-memory cache (per warm instance)
const responseCache = new Map();

/**
 * Stable cache key from sorted wallet list
 */
function makeCacheKey(wallets) {
  return wallets.slice().sort().join(",");
}

/**
 * Stellar public key validation (StrKey Ed25519 public key format)
 * Typical shape: starts with G and total length 56.
 */
function isLikelyStellarPublicKey(value) {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value);
}

/**
 * Abortable fetch with timeout
 */
async function fetchWithTimeout(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consistent response wrapper
 */
function buildSuccessResponse({
  walletCount,
  totalXLM,
  totalUSD,
  assets,
  errors = []
}) {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    walletCount,
    totalXLM,
    totalUSD,
    assets,
    errors
  };
}

function buildErrorResponse(error, message, extras = {}) {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error,
    message,
    ...extras
  };
}

/**
 * Set metadata headers
 */
function setMetaHeaders(res, cacheStatus = "MISS") {
  res.setHeader("X-WealthView-Version", API_VERSION);
  res.setHeader("X-Cache-Status", cacheStatus); // HIT | MISS | BYPASS
}

export default async function handler(req, res) {
  setMetaHeaders(res, "BYPASS");

  if (req.method !== "GET") {
    return res.status(405).json(
      buildErrorResponse("METHOD_NOT_ALLOWED", "Use GET /api/aggregate?wallets=...")
    );
  }

  const walletsParam = req.query.wallets;

  if (typeof walletsParam !== "string") {
    return res.status(400).json(
      buildErrorResponse("MALFORMED_REQUEST", "wallets query parameter is required")
    );
  }

  const walletsRaw = walletsParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (walletsRaw.length === 0) {
    return res.status(400).json(
      buildErrorResponse("EMPTY_WALLETS", "At least one wallet is required")
    );
  }

  if (walletsRaw.length > MAX_WALLETS) {
    return res.status(400).json(
      buildErrorResponse(
        "TOO_MANY_WALLETS",
        `Maximum ${MAX_WALLETS} wallets allowed per request`,
        { maxWallets: MAX_WALLETS }
      )
    );
  }

  // Reject duplicates
  const uniqueWallets = [...new Set(walletsRaw)];
  if (uniqueWallets.length !== walletsRaw.length) {
    return res.status(400).json(
      buildErrorResponse("DUPLICATE_WALLETS", "Duplicate wallet addresses are not allowed")
    );
  }

  // Validate format
  const malformed = uniqueWallets.filter((w) => !isLikelyStellarPublicKey(w));
  if (malformed.length > 0) {
    return res.status(422).json(
      buildErrorResponse(
        "INVALID_WALLETS",
        "One or more wallet addresses are malformed",
        { invalidWallets: malformed }
      )
    );
  }

  // Cache lookup
  const cacheKey = makeCacheKey(uniqueWallets);
  const cached = responseCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    setMetaHeaders(res, "HIT");
    return res.status(200).json(cached.payload);
  }

  try {
    // 1) Price fetch with timeout
    let priceRes;
    try {
      priceRes = await fetchWithTimeout(
        "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
        PRICE_TIMEOUT_MS
      );
    } catch (err) {
      if (err.name === "AbortError") {
        return res.status(504).json(
          buildErrorResponse("PRICE_TIMEOUT", "CoinGecko pricing request timed out")
        );
      }
      return res.status(502).json(
        buildErrorResponse("PRICE_FETCH_FAILED", "Failed to fetch CoinGecko price")
      );
    }

    if (!priceRes.ok) {
      return res.status(502).json(
        buildErrorResponse("PRICE_SERVICE_FAILURE", "CoinGecko returned non-OK response")
      );
    }

    const priceData = await priceRes.json();
    const xlmPrice = priceData?.stellar?.usd;

    if (typeof xlmPrice !== "number") {
      return res.status(502).json(
        buildErrorResponse("PRICE_PARSE_FAILED", "Unexpected CoinGecko response format")
      );
    }

    // 2) Aggregation (same core logic, hardened errors)
    const aggregated = {
      walletCount: uniqueWallets.length,
      totalXLM: 0,
      totalUSD: 0,
      assets: {}
    };

    const errors = [];

    for (const addr of uniqueWallets) {
      let accountRes;

      try {
        accountRes = await fetchWithTimeout(
          `https://horizon.stellar.org/accounts/${addr}`,
          HORIZON_TIMEOUT_MS
        );
      } catch (err) {
        if (err.name === "AbortError") {
          errors.push({
            wallet: addr,
            type: "HORIZON_TIMEOUT",
            message: "Horizon request timed out"
          });
        } else {
          errors.push({
            wallet: addr,
            type: "HORIZON_REQUEST_FAILED",
            message: "Horizon request failed"
          });
        }
        continue;
      }

      if (!accountRes.ok) {
        errors.push({
          wallet: addr,
          type: "HORIZON_NON_OK",
          status: accountRes.status,
          message: "Horizon returned non-OK response"
        });
        continue;
      }

      const data = await accountRes.json();

      (data.balances || []).forEach((b) => {
        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : (b.asset_code || "UNKNOWN");
        const amount = parseFloat(b.balance) || 0;
        const usdValue = isNative ? amount * xlmPrice : 0;

        if (!aggregated.assets[symbol]) {
          aggregated.assets[symbol] = {
            symbol,
            amount: 0,
            usdValue: 0
          };
        }

        aggregated.assets[symbol].amount += amount;
        aggregated.assets[symbol].usdValue += usdValue;

        if (isNative) {
          aggregated.totalXLM += amount;
          aggregated.totalUSD += usdValue;
        }
      });
    }

    const assets = Object.values(aggregated.assets)
      .sort((a, b) => b.usdValue - a.usdValue)
      .map((asset) => ({
        symbol: asset.symbol,
        amount: asset.amount,
        usdValue: asset.usdValue,
        allocationPercent:
          aggregated.totalUSD > 0 ? (asset.usdValue / aggregated.totalUSD) * 100 : 0
      }));

    const payload = buildSuccessResponse({
      walletCount: aggregated.walletCount,
      totalXLM: aggregated.totalXLM,
      totalUSD: aggregated.totalUSD,
      assets,
      errors
    });

    // Save cache
    responseCache.set(cacheKey, {
      createdAt: now,
      payload
    });

    setMetaHeaders(res, "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json(
      buildErrorResponse("INTERNAL_ERROR", "Unexpected server error", {
        details: err?.message || "Unknown error"
      })
    );
  }
}
