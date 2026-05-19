export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", message: "Use GET" });
  }

  const walletsParam = req.query.wallets;
  if (!walletsParam || typeof walletsParam !== "string") {
    return res.status(400).json({
      error: "Missing wallets query param",
      message: "Use /api/aggregate?wallets=GABC,GDEF"
    });
  }

  const wallets = walletsParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (wallets.length === 0) {
    return res.status(400).json({ error: "At least one wallet is required" });
  }

  try {
    // XLM price from CoinGecko
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );
    if (!priceRes.ok) {
      return res.status(502).json({ error: "Unable to fetch XLM price from CoinGecko" });
    }

    const priceData = await priceRes.json();
    const xlmPrice = priceData?.stellar?.usd;
    if (typeof xlmPrice !== "number") {
      return res.status(502).json({ error: "Unexpected CoinGecko price response" });
    }

    const aggregated = {
      walletCount: wallets.length,
      totalXLM: 0,
      totalUSD: 0,
      assets: {}
    };

    const skippedWallets = [];

    for (const addr of wallets) {
      const accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);

      if (!accountRes.ok) {
        skippedWallets.push(addr);
        continue;
      }

      const data = await accountRes.json();

      data.balances.forEach((b) => {
        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : (b.asset_code || "UNKNOWN");
        const amount = parseFloat(b.balance) || 0;
        const usdValue = isNative ? amount * xlmPrice : null;

        if (!aggregated.assets[symbol]) {
          aggregated.assets[symbol] = {
            symbol,
            amount: 0,
            usdValue: 0,
            priced: isNative
          };
        }

        aggregated.assets[symbol].amount += amount;

        if (isNative) {
          aggregated.assets[symbol].usdValue += usdValue;
          aggregated.totalXLM += amount;
          aggregated.totalUSD += usdValue;
        } else {
          aggregated.assets[symbol].usdValue = null;
          aggregated.assets[symbol].priced = false;
        }
      });
    }

    const assets = Object.values(aggregated.assets)
      .sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1))
      .map((asset) => ({
        symbol: asset.symbol,
        amount: asset.amount,
        usdValue: asset.usdValue,
        allocationPercent:
          asset.usdValue !== null && aggregated.totalUSD > 0
            ? (asset.usdValue / aggregated.totalUSD) * 100
            : null
      }));

    const pricedAssets = assets.filter((a) => a.usdValue !== null).map((a) => a.symbol);
    const unpricedAssets = assets.filter((a) => a.usdValue === null).map((a) => a.symbol);

    return res.status(200).json({
      walletCount: aggregated.walletCount,
      totalXLM: aggregated.totalXLM,
      totalUSD: aggregated.totalUSD,
      assets,
      pricedAssets,
      unpricedAssets,
      skippedWallets
    });
  } catch (error) {
    return res.status(500).json({
      error: "Aggregation failed",
      message: error.message
    });
  }
}
