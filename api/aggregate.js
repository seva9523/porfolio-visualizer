export default async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const walletsParam = req.query.wallets;
  if (!walletsParam || typeof walletsParam !== "string") {
    return res.status(400).json({ error: "Missing wallets query parameter." });
  }

  const wallets = walletsParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (wallets.length === 0) {
    return res.status(400).json({ error: "At least one wallet is required." });
  }

  try {
    // Keep CoinGecko XLM pricing
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );

    if (!priceRes.ok) {
      return res.status(502).json({ error: "Unable to fetch XLM price from CoinGecko." });
    }

    const priceData = await priceRes.json();
    const xlmPrice = priceData?.stellar?.usd;

    if (typeof xlmPrice !== "number") {
      return res.status(502).json({ error: "Unexpected CoinGecko price response." });
    }

    // Reuse existing aggregation logic pattern
    const aggregated = {
      walletCount: wallets.length,
      totalXLM: 0,
      totalUSD: 0,
      assets: {}
    };

    for (const addr of wallets) {
      const accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);

      // Keep behavior lightweight: skip invalid wallets
      if (!accountRes.ok) continue;

      const data = await accountRes.json();

      data.balances.forEach((b) => {
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
      .map((asset) => {
        const allocationPercent =
          aggregated.totalUSD > 0 ? (asset.usdValue / aggregated.totalUSD) * 100 : 0;

        return {
          symbol: asset.symbol,
          amount: asset.amount,
          usdValue: asset.usdValue,
          allocationPercent
        };
      });

    return res.status(200).json({
      walletCount: aggregated.walletCount,
      totalXLM: aggregated.totalXLM,
      totalUSD: aggregated.totalUSD,
      assets
    });
  } catch (error) {
    return res.status(500).json({
      error: "Aggregation failed.",
      details: error.message
    });
  }
}
