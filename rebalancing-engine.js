// ============================================================================
// REBALANCING SIMULATOR ENGINE
// ============================================================================
// Purpose: Historical simulation of portfolio rebalancing strategies
// NOT FINANCIAL ADVICE - Purely educational visualization
// ============================================================================

/**
 * REBALANCING STRATEGIES
 */
const REBALANCING_STRATEGIES = {
    NONE: 'none',
    ANNUAL: 'annual',
    QUARTERLY: 'quarterly',
    THRESHOLD: 'threshold'
};

/**
 * Calculate portfolio value on a given date
 * @param {Object} holdings - Array of {ticker, shares, historicalData}
 * @param {String} date - YYYY-MM-DD format
 * @returns {Number} Total portfolio value
 */
function calculatePortfolioValue(holdings, date) {
    let totalValue = 0;
    
    holdings.forEach(holding => {
        if (holding.historicalData && holding.historicalData[date]) {
            const price = holding.historicalData[date].close;
            totalValue += holding.shares * price;
        }
    });
    
    return totalValue;
}

/**
 * Calculate current allocation weights
 * @param {Object} holdings - Array of holdings
 * @param {String} date - Date for price lookup
 * @returns {Object} {ticker: weight%}
 */
function calculateCurrentWeights(holdings, date) {
    const totalValue = calculatePortfolioValue(holdings, date);
    const weights = {};
    
    holdings.forEach(holding => {
        if (holding.historicalData && holding.historicalData[date]) {
            const price = holding.historicalData[date].close;
            const value = holding.shares * price;
            weights[holding.ticker] = (value / totalValue) * 100;
        }
    });
    
    return weights;
}

/**
 * Check if rebalancing is needed (threshold-based)
 * @param {Object} currentWeights - Current portfolio weights
 * @param {Object} targetWeights - Target allocation
 * @param {Number} threshold - Drift threshold (e.g., 5 means ±5%)
 * @returns {Boolean}
 */
function needsRebalancing(currentWeights, targetWeights, threshold) {
    for (let ticker in targetWeights) {
        const current = currentWeights[ticker] || 0;
        const target = targetWeights[ticker];
        const drift = Math.abs(current - target);
        
        if (drift > threshold) {
            return true;
        }
    }
    return false;
}

/**
 * Rebalance portfolio to target weights
 * @param {Object} holdings - Current holdings
 * @param {Object} targetWeights - Target allocation (%)
 * @param {String} date - Rebalancing date
 * @returns {Object} New holdings array
 */
function rebalancePortfolio(holdings, targetWeights, date) {
    const totalValue = calculatePortfolioValue(holdings, date);
    const newHoldings = [];
    
    holdings.forEach(holding => {
        if (!holding.historicalData || !holding.historicalData[date]) {
            newHoldings.push({...holding});
            return;
        }
        
        const price = holding.historicalData[date].close;
        const targetWeight = targetWeights[holding.ticker] || 0;
        const targetValue = (totalValue * targetWeight) / 100;
        const newShares = targetValue / price;
        
        newHoldings.push({
            ...holding,
            shares: newShares
        });
    });
    
    return newHoldings;
}

/**
 * Get all trading dates from holdings historical data
 * @param {Object} holdings - Array of holdings
 * @returns {Array} Sorted array of dates
 */
function getAllTradingDates(holdings) {
    const allDates = new Set();
    
    holdings.forEach(holding => {
        if (holding.historicalData) {
            Object.keys(holding.historicalData).forEach(date => allDates.add(date));
        }
    });
    
    return Array.from(allDates).sort();
}

/**
 * CORE BACKTEST ENGINE
 * Simulates portfolio performance with a rebalancing strategy
 * 
 * @param {Object} params
 * @param {Array} params.holdings - Initial holdings
 * @param {Object} params.targetWeights - Target allocation {ticker: weight%}
 * @param {String} params.strategy - Rebalancing strategy
 * @param {Number} params.threshold - Threshold for threshold-based (default 5)
 * @param {String} params.startDate - Start date (YYYY-MM-DD)
 * @param {String} params.endDate - End date (YYYY-MM-DD)
 * 
 * @returns {Object} Simulation results
 */
function runRebalancingBacktest(params) {
    const {
        holdings: initialHoldings,
        targetWeights,
        strategy = REBALANCING_STRATEGIES.NONE,
        threshold = 5,
        startDate,
        endDate
    } = params;
    
    // Get all trading dates in range
    const allDates = getAllTradingDates(initialHoldings);
    const tradingDates = allDates.filter(date => date >= startDate && date <= endDate);
    
    if (tradingDates.length === 0) {
        return { error: 'No trading data available for date range' };
    }
    
    // Track portfolio over time
    let currentHoldings = JSON.parse(JSON.stringify(initialHoldings)); // Deep copy
    const portfolioHistory = [];
    const allocationHistory = [];
    let rebalanceCount = 0;
    const rebalanceDates = [];
    
    // Track when to rebalance
    let lastRebalanceDate = tradingDates[0];
    let lastRebalanceMonth = new Date(lastRebalanceDate).getMonth();
    let lastRebalanceQuarter = Math.floor(new Date(lastRebalanceDate).getMonth() / 3);
    
    tradingDates.forEach((date, index) => {
        const currentDate = new Date(date);
        const currentMonth = currentDate.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        
        // Calculate current value and weights
        const portfolioValue = calculatePortfolioValue(currentHoldings, date);
        const currentWeights = calculateCurrentWeights(currentHoldings, date);
        
        // Record history
        portfolioHistory.push({
            date: date,
            value: portfolioValue,
            weights: {...currentWeights}
        });
        
        allocationHistory.push({
            date: date,
            ...currentWeights
        });
        
        // Determine if we should rebalance
        let shouldRebalance = false;
        
        if (strategy === REBALANCING_STRATEGIES.ANNUAL) {
            // Rebalance on first trading day of each year
            const lastYear = new Date(lastRebalanceDate).getFullYear();
            const currentYear = currentDate.getFullYear();
            if (currentYear > lastYear) {
                shouldRebalance = true;
            }
        } else if (strategy === REBALANCING_STRATEGIES.QUARTERLY) {
            // Rebalance on first trading day of each quarter
            if (currentQuarter !== lastRebalanceQuarter) {
                shouldRebalance = true;
            }
        } else if (strategy === REBALANCING_STRATEGIES.THRESHOLD) {
            // Rebalance if drift exceeds threshold
            shouldRebalance = needsRebalancing(currentWeights, targetWeights, threshold);
        }
        
        // Execute rebalancing
        if (shouldRebalance && index > 0) { // Don't rebalance on first day
            currentHoldings = rebalancePortfolio(currentHoldings, targetWeights, date);
            rebalanceCount++;
            rebalanceDates.push(date);
            lastRebalanceDate = date;
            lastRebalanceQuarter = currentQuarter;
        }
    });
    
    // Calculate performance metrics
    const metrics = calculatePerformanceMetrics(portfolioHistory, tradingDates);
    
    // Calculate final allocation drift
    const finalWeights = portfolioHistory[portfolioHistory.length - 1].weights;
    const finalDrift = calculateAllocationDrift(finalWeights, targetWeights);
    
    return {
        strategy: strategy,
        portfolioHistory: portfolioHistory,
        allocationHistory: allocationHistory,
        metrics: metrics,
        rebalanceCount: rebalanceCount,
        rebalanceDates: rebalanceDates,
        finalAllocation: finalWeights,
        finalDrift: finalDrift,
        startDate: tradingDates[0],
        endDate: tradingDates[tradingDates.length - 1]
    };
}

/**
 * Calculate performance metrics
 * @param {Array} portfolioHistory - Array of {date, value}
 * @param {Array} tradingDates - All trading dates
 * @returns {Object} Performance metrics
 */
function calculatePerformanceMetrics(portfolioHistory, tradingDates) {
    if (portfolioHistory.length < 2) {
        return {
            cagr: 0,
            volatility: 0,
            maxDrawdown: 0,
            totalReturn: 0
        };
    }
    
    const startValue = portfolioHistory[0].value;
    const endValue = portfolioHistory[portfolioHistory.length - 1].value;
    const years = portfolioHistory.length / 252; // Approximate trading days per year
    
    // CAGR
    const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    
    // Total Return
    const totalReturn = ((endValue - startValue) / startValue) * 100;
    
    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < portfolioHistory.length; i++) {
        const prevValue = portfolioHistory[i - 1].value;
        const currValue = portfolioHistory[i].value;
        const dailyReturn = (currValue - prevValue) / prevValue;
        dailyReturns.push(dailyReturn);
    }
    
    // Annualized Volatility
    const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
    
    // Maximum Drawdown
    let peak = portfolioHistory[0].value;
    let maxDrawdown = 0;
    
    portfolioHistory.forEach(point => {
        if (point.value > peak) {
            peak = point.value;
        }
        const drawdown = (peak - point.value) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    });
    
    maxDrawdown = maxDrawdown * 100; // Convert to percentage
    
    return {
        cagr: cagr,
        volatility: volatility,
        maxDrawdown: maxDrawdown,
        totalReturn: totalReturn,
        startValue: startValue,
        endValue: endValue
    };
}

/**
 * Calculate allocation drift from target
 * @param {Object} currentWeights - Current weights
 * @param {Object} targetWeights - Target weights
 * @returns {Object} Drift for each asset
 */
function calculateAllocationDrift(currentWeights, targetWeights) {
    const drift = {};
    
    for (let ticker in targetWeights) {
        const current = currentWeights[ticker] || 0;
        const target = targetWeights[ticker];
        drift[ticker] = current - target;
    }
    
    return drift;
}

/**
 * Compare multiple rebalancing strategies
 * @param {Object} params - Same as runRebalancingBacktest
 * @param {Array} strategies - Array of strategy names to compare
 * @returns {Object} Comparison results
 */
function compareRebalancingStrategies(params, strategies = ['none', 'annual', 'quarterly']) {
    const results = {};
    
    strategies.forEach(strategy => {
        const strategyParams = {
            ...params,
            strategy: strategy
        };
        
        results[strategy] = runRebalancingBacktest(strategyParams);
    });
    
    return results;
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.RebalancingEngine = {
        STRATEGIES: REBALANCING_STRATEGIES,
        runBacktest: runRebalancingBacktest,
        compareStrategies: compareRebalancingStrategies,
        calculatePortfolioValue: calculatePortfolioValue,
        calculateCurrentWeights: calculateCurrentWeights
    };
}
// ========================================
// EXPORT MODULE (for Jest / Node tests)
// ========================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    REBALANCING_STRATEGIES,
    calculatePortfolioValue,
    calculateCurrentWeights,
    needsRebalancing,
    rebalancePortfolio,
    getAllTradingDates,
    runRebalancingBacktest,
    calculatePerformanceMetrics,
    calculateAllocationDrift,
    compareRebalancingStrategies
  };
}
