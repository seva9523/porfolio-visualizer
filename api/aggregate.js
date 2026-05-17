export default async function handler(req, res) {
  // 1) Method check
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "Use GET /api/aggregate?wallets=GABC,GDEF"
    });
  }

  // 2) Query param validation
  const walletsParam = req.query.wallets;

  if (typeof walletsParam !== "string") {
    return res.status(400).json({
      error: "Malformed request",
      message: "wallets query parameter is required as a comma-separated string"
    });
  }

  const wallets = walletsParam
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  if (wallets.length === 0) {
    return res.status(400).json({
      error: "Empty wallets",
      message: "At least one wallet is required"
    });
  }

  // lightweight wallet format check (Stellar public key usually starts with G, length 56)
  const invalidWallets = wallets.filter((w) => !(w.startsWith("G") && w.length === 56));
  if (invalidWallets.length > 0) {
    return res.status(422).json({
      error: "Invalid wallets",
      message: "One or more wallets are not valid Stellar public addresses",
      invalidWallets
    });
  }

  try {
    // 3) CoinGecko pricing
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );

    if (!priceRes.ok) {
      return res.status(502).json({
        error: "Pricing service failure",
        message: "Unable to fetch XLM price from CoinGecko"
      });
    }

    const priceData = await priceRes.json();
    const xlmPrice = priceData?.stellar?.usd;

    if (typeof xlmPrice !== "number") {
      return res.status(502).json({
        error: "Pricing service failure",
        message: "Unexpected CoinGecko response format"
      });
    }

    // 4) Reuse existing aggregation engine pattern
    const aggregated = {
      walletCount: wallets.length,
      totalXLM: 0,
      totalUSD: 0,
      assets: {}
    };

    const skippedWallets = [];
    let stellarFailures = 0;

    for (const addr of wallets) {
      let accountRes;
      try {
        accountRes = await fetch(`https://horizon.stellar.org/accounts/${addr}`);
      } catch (_) {
        stellarFailures += 1;
        skippedWallets.push(addr);
        continue;
      }

      if (!accountRes.ok) {
        if (accountRes.status >= 500) stellarFailures += 1;
        skippedWallets.push(addr);
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

    // If every wallet failed due to Stellar-side/network issues
    if (Object.keys(aggregated.assets).length === 0 && stellarFailures > 0) {
      return res.status(502).json({
        error: "Stellar API failure",
        message: "Unable to fetch account data from Horizon",
        skippedWallets
      });
    }

    // 5) Final structured response
    const assets = Object.values(aggregated.assets)
      .sort((a, b) => b.usdValue - a.usdValue)
      .map((asset) => ({
        symbol: asset.symbol,
        amount: asset.amount,
        usdValue: asset.usdValue,
        allocationPercent:
          aggregated.totalUSD > 0 ? (asset.usdValue / aggregated.totalUSD) * 100 : 0
      }));

    return res.status(200).json({
      walletCount: aggregated.walletCount,
      totalXLM: aggregated.totalXLM,
      totalUSD: aggregated.totalUSD,
      assets,
      skippedWallets
    });
  } catch (error) {
    return res.status(500).json({
      error: "Aggregation failed",
      message: error?.message || "Unexpected server error"
    });
  }
}
