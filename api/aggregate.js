const ASSET_TO_COINGECKO = {
  XLM: 'stellar',
  USDZ: 'usdz'
};

const normalizeAssetCode = (code) => (code || '').trim().toUpperCase();

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed', message: 'Use GET' });
  }

  const walletsParam = req.query.wallets;
  if (!walletsParam || typeof walletsParam !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing wallets query param',
      message: 'Use /api/aggregate?wallets=GABC,GDEF'
    });
  }

  const wallets = walletsParam
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);

  if (wallets.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one wallet is required', message: 'wallets query param is empty' });
  }

  try {
    const allBalances = [];

    for (const addr of wallets) {
      const accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
      if (!accountRes.ok) continue;

      const data = await accountRes.json();
      (data.balances || []).forEach((b) => {
        const isNative = b.asset_type === 'native';
        const symbol = isNative ? 'XLM' : normalizeAssetCode(b.asset_code || 'UNKNOWN');
        const amount = parseFloat(b.balance) || 0;
        allBalances.push({ symbol, amount });
      });
    }

    const symbols = [...new Set(allBalances.map((b) => b.symbol))];
    const pricedAssets = [];
    const unpricedAssets = [];

    const geckoIds = [...new Set(symbols.map((s) => ASSET_TO_COINGECKO[s]).filter(Boolean))];

    let priceMap = {};
    if (geckoIds.length > 0) {
      const ids = geckoIds.join(',');
      const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`);
      if (!priceRes.ok) {
        return res.status(502).json({ success: false, error: 'Pricing API failed', message: 'Unable to fetch CoinGecko prices' });
      }
      priceMap = await priceRes.json();
    }

    const assetsBySymbol = {};
    let totalXLM = 0;
    let totalUSD = 0;

    allBalances.forEach(({ symbol, amount }) => {
      if (!assetsBySymbol[symbol]) {
        assetsBySymbol[symbol] = { symbol, amount: 0, usdValue: null };
      }
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
        allocationPercent:
          asset.usdValue !== null && totalUSD > 0
            ? (asset.usdValue / totalUSD) * 100
            : null
      }))
      .sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1));

    return res.status(200).json({
      success: true,
      walletCount: wallets.length,
      totalXLM,
      totalUSD,
      assets,
      pricedAssets,
      unpricedAssets,
      metadata: {
        assetToCoinGecko: ASSET_TO_COINGECKO
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Aggregation failed', message: error.message });
  }
}
