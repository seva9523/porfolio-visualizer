const STABLE_ASSET_SYMBOLS = ['USDC', 'USDZ', 'EURC', 'USDT'];

export function generateTreasurySignals(aggregatedData) {
  const assets = Array.isArray(aggregatedData?.assets) ? aggregatedData.assets : [];
  const pricedAssets = assets.filter((asset) => typeof asset.usdValue === 'number' && asset.usdValue > 0);
  const totalPricedValue = pricedAssets.reduce((sum, asset) => sum + asset.usdValue, 0);
  const largestAsset = pricedAssets.slice().sort((a, b) => b.usdValue - a.usdValue)[0] || null;
  const largestAssetShare = largestAsset && totalPricedValue > 0 ? (largestAsset.usdValue / totalPricedValue) * 100 : 0;
  const unpricedCount = Array.isArray(aggregatedData?.unpricedAssets)
    ? aggregatedData.unpricedAssets.length
    : assets.filter((asset) => asset.usdValue === null || asset.usdValue === undefined).length;
  const stableValue = pricedAssets
    .filter((asset) => STABLE_ASSET_SYMBOLS.includes(String(asset.symbol || '').toUpperCase()))
    .reduce((sum, asset) => sum + asset.usdValue, 0);
  const stableShare = totalPricedValue > 0 ? (stableValue / totalPricedValue) * 100 : 0;
  const walletCount = Number(aggregatedData?.walletCount || 0);
  const walletConcentrationValue = walletCount === 1 && totalPricedValue > 0 ? 100 : null;

  return {
    assetConcentration: {
      severity: largestAssetShare > 80 ? 'watch' : 'good',
      label: 'Asset Concentration',
      message: largestAssetShare > 80
        ? `High asset concentration: ${largestAsset.symbol} represents ${Math.round(largestAssetShare)}% of priced treasury value.`
        : 'Asset concentration looks balanced.',
      value: Math.round(largestAssetShare)
    },
    walletConcentration: {
      severity: walletConcentrationValue && walletConcentrationValue > 80 ? 'watch' : 'good',
      label: 'Wallet Concentration',
      message: walletConcentrationValue && walletConcentrationValue > 80
        ? `High wallet concentration: one wallet holds ${walletConcentrationValue}% of priced treasury value.`
        : 'Wallet distribution looks balanced.',
      value: walletConcentrationValue
    },
    unpricedAssets: {
      severity: unpricedCount > 0 ? 'info' : 'good',
      label: 'Unpriced Assets',
      message: unpricedCount > 0
        ? `${unpricedCount} ${unpricedCount === 1 ? 'asset does' : 'assets do'} not have pricing data.`
        : 'All detected assets are priced.',
      value: unpricedCount
    },
    stableExposure: {
      severity: stableShare > 0 ? 'info' : 'info',
      label: 'Stable Exposure',
      message: stableShare > 0
        ? `Stable asset exposure: ${Math.round(stableShare)}% of priced treasury value.`
        : 'No stable asset exposure detected.',
      value: Math.round(stableShare)
    },
    idleTreasury: {
      severity: largestAssetShare > 90 ? 'watch' : 'good',
      label: 'Idle Treasury Signal',
      message: largestAssetShare > 90
        ? 'Potential idle treasury: most value is concentrated in one asset.'
        : 'No simple idle treasury signal detected.',
      value: largestAssetShare > 90
    }
  };
}

export function toSignalsApiPayload(signals) {
  return Object.fromEntries(
    Object.entries(signals).map(([key, signal]) => [
      key,
      {
        severity: signal.severity,
        value: signal.value,
        message: signal.message
      }
    ])
  );
}
