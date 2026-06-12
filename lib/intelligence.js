const STABLE_ASSET_SYMBOLS = ['USDC', 'USDZ', 'EURC', 'GBPX', 'EURX', 'USDT'];
const VOLATILE_CORE_SYMBOLS = ['XLM'];

const round = (value, digits = 2) => Number((Number(value) || 0).toFixed(digits));
const normalizeSymbol = (value) => String(value || '').trim().toUpperCase();
const assetIdentity = (asset) => asset?.contractId ? `contract:${asset.contractId}` : normalizeSymbol(asset?.symbol || 'UNKNOWN');
const assetLabel = (asset) => asset?.symbol || asset?.contractId || 'UNKNOWN';

function getPricedAssets(assets) {
  return assets.filter((asset) => typeof asset.usdValue === 'number' && Number.isFinite(asset.usdValue) && asset.usdValue > 0);
}

function getUnpricedAssets(assets) {
  return assets.filter((asset) => asset.usdValue === null || asset.usdValue === undefined || Number.isNaN(Number(asset.usdValue)));
}

function getLargestAsset(pricedAssets) {
  return pricedAssets.slice().sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))[0] || null;
}

function scoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Watch';
  return 'High Risk';
}

function categoryLabel(score) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Ready';
  if (score >= 40) return 'Watch';
  return 'Needs Attention';
}

function buildMetrics(aggregateData = {}) {
  const assets = Array.isArray(aggregateData.assets) ? aggregateData.assets : [];
  const pricedAssets = getPricedAssets(assets);
  const unpricedAssets = getUnpricedAssets(assets);
  const totalUSD = Number(aggregateData.totalUSD || 0);
  const walletCount = Number(aggregateData.walletCount || 0);
  const totalPricedValue = pricedAssets.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const largestAsset = getLargestAsset(pricedAssets);
  const largestAssetShare = largestAsset && totalPricedValue > 0 ? (Number(largestAsset.usdValue || 0) / totalPricedValue) * 100 : 0;
  const stableAssets = pricedAssets.filter((asset) => STABLE_ASSET_SYMBOLS.includes(normalizeSymbol(asset.symbol)));
  const stableValue = stableAssets.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const stableShare = totalPricedValue > 0 ? (stableValue / totalPricedValue) * 100 : 0;
  const volatileAssets = pricedAssets.filter((asset) => !STABLE_ASSET_SYMBOLS.includes(normalizeSymbol(asset.symbol)));
  const volatileValue = volatileAssets.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const volatileShare = totalPricedValue > 0 ? (volatileValue / totalPricedValue) * 100 : 0;
  const pricingCoverage = assets.length > 0 ? (pricedAssets.length / assets.length) * 100 : 100;

  return {
    assets,
    pricedAssets,
    unpricedAssets,
    totalUSD,
    walletCount,
    totalPricedValue,
    largestAsset,
    largestAssetShare,
    stableAssets,
    stableValue,
    stableShare,
    volatileAssets,
    volatileValue,
    volatileShare,
    pricingCoverage
  };
}

export function detectTreasuryChanges(currentAggregate = {}, previousSnapshot = null) {
  if (!previousSnapshot) {
    return {
      available: false,
      message: 'Upload or compare with a previous snapshot to detect treasury changes.',
      changes: []
    };
  }

  const currentAssets = Array.isArray(currentAggregate.assets) ? currentAggregate.assets : [];
  const previousAssets = Array.isArray(previousSnapshot.assets) ? previousSnapshot.assets : [];
  const previousAssetMap = new Map(previousAssets.map((asset) => [assetIdentity(asset), asset]));
  const currentAssetMap = new Map(currentAssets.map((asset) => [assetIdentity(asset), asset]));
  const newAssets = currentAssets.filter((asset) => !previousAssetMap.has(assetIdentity(asset))).map(assetLabel);
  const removedAssets = previousAssets.filter((asset) => !currentAssetMap.has(assetIdentity(asset))).map(assetLabel);
  const totalUSDChange = Number(currentAggregate.totalUSD || 0) - Number(previousSnapshot.totalUSD || 0);
  const totalXLMChange = Number(currentAggregate.totalXLM || 0) - Number(previousSnapshot.totalXLM || 0);
  const currentPriced = getPricedAssets(currentAssets);
  const previousPriced = getPricedAssets(previousAssets);
  const currentLargest = getLargestAsset(currentPriced);
  const previousLargest = getLargestAsset(previousPriced);
  const currentTotalPriced = currentPriced.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const previousTotalPriced = previousPriced.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const currentConcentration = currentLargest && currentTotalPriced > 0 ? (Number(currentLargest.usdValue || 0) / currentTotalPriced) * 100 : 0;
  const previousConcentration = previousLargest && previousTotalPriced > 0 ? (Number(previousLargest.usdValue || 0) / previousTotalPriced) * 100 : 0;

  return {
    available: true,
    previousTimestamp: previousSnapshot.timestamp || null,
    totalUSDChange: round(totalUSDChange),
    totalUSDChangePercent: Number(previousSnapshot.totalUSD || 0) > 0 ? round((totalUSDChange / Number(previousSnapshot.totalUSD || 0)) * 100) : null,
    totalXLMChange: round(totalXLMChange, 6),
    walletCountChange: Number(currentAggregate.walletCount || 0) - Number(previousSnapshot.walletCount || 0),
    pricingCoverageChange: currentAssets.length && previousAssets.length
      ? round((getPricedAssets(currentAssets).length / currentAssets.length) * 100 - (getPricedAssets(previousAssets).length / previousAssets.length) * 100)
      : null,
    concentrationChange: round(currentConcentration - previousConcentration),
    newAssets,
    removedAssets,
    message: `Treasury value changed by ${round(totalUSDChange)} USD${previousSnapshot.timestamp ? ` since ${previousSnapshot.timestamp}` : ''}.`,
    changes: [
      { label: 'Total USD value', value: round(totalUSDChange), unit: 'USD' },
      { label: 'Total XLM', value: round(totalXLMChange, 6), unit: 'XLM' },
      { label: 'New assets', value: newAssets.length, assets: newAssets },
      { label: 'Removed assets', value: removedAssets.length, assets: removedAssets },
      { label: 'Concentration change', value: round(currentConcentration - previousConcentration), unit: 'percentage points' }
    ]
  };
}

export function generateTreasuryIntelligence(aggregateData = {}, options = {}) {
  const metrics = buildMetrics(aggregateData);
  const previousSnapshot = options.previousSnapshot || null;
  const changeDetection = detectTreasuryChanges(aggregateData, previousSnapshot);
  const risks = [];
  const strengths = [];
  let score = 100;

  if (metrics.walletCount > 1) strengths.push('Multi-wallet visibility enabled');
  else { score -= 10; risks.push('Treasury visibility depends on a single wallet.'); }

  if (metrics.largestAssetShare > 80) { score -= 20; risks.push(`High ${assetLabel(metrics.largestAsset)} concentration.`); }
  else if (metrics.largestAssetShare > 60) { score -= 10; risks.push(`Moderate ${assetLabel(metrics.largestAsset)} concentration.`); }
  else if (metrics.pricedAssets.length > 1) strengths.push('Asset concentration is not dominated by one priced asset.');

  if (metrics.stableShare >= 15 && metrics.stableShare <= 70) strengths.push('Stable asset liquidity is visible.');
  if (metrics.stableShare < 5 && metrics.totalPricedValue > 0) { score -= 8; risks.push('Low stablecoin liquidity detected.'); }
  if (metrics.stableShare > 85) { score -= 6; risks.push('Very high stablecoin exposure may need treasury policy review.'); }

  if (metrics.volatileShare > 80 && metrics.totalPricedValue > 0) { score -= 12; risks.push('High volatile asset exposure.'); }
  if (metrics.pricingCoverage < 100) { score -= Math.min(20, (100 - metrics.pricingCoverage) * 0.35); risks.push('Some assets are missing reliable pricing.'); }
  else if (metrics.assets.length > 0) strengths.push('All detected assets have pricing coverage.');

  const idleAssets = [];
  metrics.stableAssets.forEach((asset) => {
    const share = metrics.totalPricedValue > 0 ? (Number(asset.usdValue || 0) / metrics.totalPricedValue) * 100 : 0;
    if (share >= 10) idleAssets.push({ symbol: asset.symbol, usdValue: round(asset.usdValue), share: round(share), reason: 'Meaningful stablecoin balance' });
  });
  metrics.pricedAssets.forEach((asset) => {
    const symbol = normalizeSymbol(asset.symbol);
    const share = metrics.totalPricedValue > 0 ? (Number(asset.usdValue || 0) / metrics.totalPricedValue) * 100 : 0;
    if (VOLATILE_CORE_SYMBOLS.includes(symbol) && share >= 70) idleAssets.push({ symbol: asset.symbol, usdValue: round(asset.usdValue), share: round(share), reason: 'Large XLM concentration' });
  });
  const idleCapitalUSD = idleAssets.reduce((sum, asset) => sum + Number(asset.usdValue || 0), 0);
  const idleCapitalPercent = metrics.totalPricedValue > 0 ? (idleCapitalUSD / metrics.totalPricedValue) * 100 : 0;
  if (idleCapitalPercent > 50) { score -= 10; risks.push('A large share of priced treasury value may be idle.'); }
  else if (idleCapitalPercent > 0) strengths.push('Liquid reserves are identifiable for treasury planning.');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = scoreLabel(score);

  const alerts = [];
  alerts.push({
    severity: metrics.largestAssetShare > 80 ? 'risk' : metrics.largestAssetShare > 60 ? 'watch' : 'good',
    title: 'Concentration Risk',
    explanation: metrics.largestAsset
      ? `${assetLabel(metrics.largestAsset)} represents ${Math.round(metrics.largestAssetShare)}% of priced treasury value.`
      : 'No priced asset concentration is available yet.',
    suggestedAction: metrics.largestAssetShare > 60 ? 'Review concentration limits and diversification policy.' : 'Maintain periodic concentration monitoring.'
  });
  alerts.push({
    severity: metrics.stableShare > 85 || metrics.stableShare < 5 ? 'watch' : 'info',
    title: 'Stablecoin Exposure',
    explanation: `Stable assets represent ${Math.round(metrics.stableShare)}% of priced treasury value.`,
    suggestedAction: 'Confirm stablecoin balances match liquidity and reserve requirements.'
  });
  alerts.push({
    severity: metrics.volatileShare > 80 ? 'watch' : 'info',
    title: 'Volatility Exposure',
    explanation: `Non-stable priced assets represent ${Math.round(metrics.volatileShare)}% of priced treasury value.`,
    suggestedAction: 'Stress test treasury value against market moves.'
  });
  alerts.push({
    severity: metrics.unpricedAssets.length > 0 ? 'info' : 'good',
    title: 'Pricing Coverage',
    explanation: metrics.unpricedAssets.length > 0
      ? `${metrics.unpricedAssets.length} asset${metrics.unpricedAssets.length === 1 ? ' is' : 's are'} missing reliable pricing.`
      : 'All detected assets are priced.',
    suggestedAction: metrics.unpricedAssets.length > 0 ? 'Add explicit pricing mappings only when reliable sources exist.' : 'Continue monitoring pricing coverage.'
  });
  alerts.push({
    severity: metrics.walletCount <= 1 ? 'watch' : 'good',
    title: 'Wallet Aggregation',
    explanation: metrics.walletCount <= 1 ? 'Only one wallet is included in this treasury view.' : `${metrics.walletCount} wallets are aggregated.`,
    suggestedAction: metrics.walletCount <= 1 ? 'Add reserve, operations, and ecosystem wallets for fuller visibility.' : 'Keep wallet inventory updated.'
  });
  alerts.push({
    severity: idleCapitalPercent > 50 ? 'watch' : idleCapitalPercent > 10 ? 'info' : 'good',
    title: 'Idle Capital',
    explanation: idleCapitalUSD > 0
      ? `${round(idleCapitalPercent)}% of priced treasury value may be idle based on visible balances.`
      : 'No material idle capital pattern was detected from priced assets.',
    suggestedAction: 'Review what should remain liquid versus what could be allocated to productive treasury strategies.'
  });
  if (changeDetection.available) {
    alerts.push({
      severity: Math.abs(changeDetection.totalUSDChangePercent || 0) >= 20 ? 'watch' : 'info',
      title: 'Treasury Value Movement',
      explanation: `Total USD changed by ${changeDetection.totalUSDChangePercent ?? 'N/A'}% versus the previous snapshot.`,
      suggestedAction: 'Review asset flows, price movement, and treasury policy impact.'
    });
    alerts.push({
      severity: changeDetection.newAssets.length > 0 ? 'info' : 'good',
      title: 'New Asset Detection',
      explanation: changeDetection.newAssets.length > 0 ? `New assets detected: ${changeDetection.newAssets.join(', ')}.` : 'No new assets detected versus the previous snapshot.',
      suggestedAction: changeDetection.newAssets.length > 0 ? 'Validate new asset purpose, issuer, and pricing coverage.' : 'Continue snapshot comparisons over time.'
    });
  }

  const benchmarks = {
    diversification: {
      score: Math.max(0, Math.round(100 - metrics.largestAssetShare)),
      label: categoryLabel(Math.max(0, 100 - metrics.largestAssetShare)),
      explanation: 'Compared against WealthView treasury-readiness rules for asset diversification.'
    },
    liquidity: {
      score: Math.min(100, Math.round(metrics.stableShare + (metrics.walletCount > 1 ? 15 : 0))),
      label: categoryLabel(Math.min(100, metrics.stableShare + (metrics.walletCount > 1 ? 15 : 0))),
      explanation: 'Scores visible stable assets and multi-wallet liquidity visibility.'
    },
    concentrationRisk: {
      score: Math.max(0, Math.round(100 - metrics.largestAssetShare)),
      label: categoryLabel(Math.max(0, 100 - metrics.largestAssetShare)),
      explanation: 'Lower single-asset dominance produces a stronger concentration benchmark.'
    },
    stablecoinBalance: {
      score: metrics.totalPricedValue > 0 ? Math.max(0, Math.round(100 - Math.abs(35 - metrics.stableShare))) : 50,
      label: categoryLabel(metrics.totalPricedValue > 0 ? Math.max(0, 100 - Math.abs(35 - metrics.stableShare)) : 50),
      explanation: 'Rule-based target rewards visible but not excessive stable asset exposure.'
    },
    pricingCoverage: {
      score: Math.round(metrics.pricingCoverage),
      label: categoryLabel(metrics.pricingCoverage),
      explanation: 'Measures how much of the detected asset list has reliable pricing.'
    },
    treasuryReadiness: {
      score,
      label,
      explanation: 'Overall WealthView treasury-readiness score using visible balances, pricing, and risk signals.'
    }
  };

  const biggestStrength = strengths[0] || 'Treasury data is visible through a reusable API-driven workflow.';
  const biggestRisk = risks[0] || 'No major rule-based risk detected from visible balances.';
  const keyAlerts = alerts.filter((alert) => ['risk', 'watch'].includes(alert.severity)).slice(0, 3);
  const recommendedNextActions = [
    biggestRisk.includes('pricing') ? 'Improve pricing coverage for unpriced assets.' : 'Review treasury concentration and liquidity policy.',
    idleCapitalUSD > 0 ? 'Decide what portion of idle capital should remain liquid.' : 'Continue monitoring idle capital patterns.',
    changeDetection.available ? 'Review changes versus the previous snapshot.' : 'Save or upload a previous snapshot for change detection.'
  ];

  const executiveBrief = [
    `Executive Treasury Brief — ${new Date().toISOString()}`,
    `Current visible treasury value: $${round(metrics.totalUSD).toLocaleString()}.`,
    `Treasury Health: ${score}/100 (${label}).`,
    `Biggest strength: ${biggestStrength}`,
    `Biggest risk: ${biggestRisk}`,
    `Estimated idle capital: $${round(idleCapitalUSD).toLocaleString()} (${round(idleCapitalPercent)}% of priced treasury value).`,
    keyAlerts.length ? `Key alerts: ${keyAlerts.map((alert) => alert.title).join(', ')}.` : 'Key alerts: no high-priority alerts from current visible balances.',
    changeDetection.available ? `Change summary: ${changeDetection.message}` : 'Change summary: no previous snapshot available.',
    `Recommended next actions: ${recommendedNextActions.join(' ')}`
  ].join('\n');

  return {
    treasuryHealth: {
      score,
      label,
      strengths,
      risks,
      explanation: `Score reflects diversification, concentration risk, liquidity, stablecoin exposure, volatile exposure, idle capital, valuation completeness, wallet coverage, and detected risk signals.`
    },
    idleCapital: {
      estimatedUSD: round(idleCapitalUSD),
      percentage: round(idleCapitalPercent),
      assets: idleAssets,
      explanation: idleCapitalUSD > 0
        ? `$${round(idleCapitalUSD).toLocaleString()} may be sitting idle based on visible priced balances. This represents ${round(idleCapitalPercent)}% of priced treasury value.`
        : 'No meaningful priced idle capital pattern was detected.',
      opportunityNote: 'Potential action: review whether part of this balance should remain liquid or be allocated to productive treasury strategies. This does not claim real yield.'
    },
    alerts,
    benchmarks,
    changeDetection,
    changeDetectionAvailable: changeDetection.available,
    executiveBrief,
    simulationDefaults: {
      xlmPriceChangePercent: -20,
      stablecoinDepegPercent: -2,
      topAssetDeclinePercent: -25,
      reallocationPercent: 10,
      disclaimer: 'Simulation is an estimate based on current visible balances and prices. It is not financial advice.'
    }
  };
}
