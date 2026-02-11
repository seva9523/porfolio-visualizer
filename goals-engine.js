// ========================================
// FINANCIAL GOALS ENGINE - DATA MODEL
// ========================================

/*
 * IMPORTANT DISCLAIMERS (ALWAYS PRESENT IN UI):
 * - This tool illustrates possible outcomes based on historical data
 * - Simulations are not predictions or guarantees
 * - Past performance does not indicate future results
 * - This is NOT financial advice
 */

// Goal Types
const GOAL_TYPES = {
    RETIREMENT: 'retirement',
    HOME: 'home',
    EDUCATION: 'education',
    SHORT_TERM: 'short_term',
    FIRE: 'fire'
};

// Goal Data Structure
class FinancialGoal {
    constructor({
        id = null,
        name = '',
        type = GOAL_TYPES.RETIREMENT,
        targetAmount = 0,
        timeHorizonYears = 0,
        currentSavings = 0,
        monthlyContribution = 0,
        linkedPortfolioId = null,
        flexibility = 50, // 0-100%, willingness to adjust contributions
        created = new Date().toISOString()
    }) {
        this.id = id || 'goal_' + Date.now();
        this.name = name;
        this.type = type;
        this.targetAmount = targetAmount;
        this.timeHorizonYears = timeHorizonYears;
        this.currentSavings = currentSavings;
        this.monthlyContribution = monthlyContribution;
        this.linkedPortfolioId = linkedPortfolioId;
        this.flexibility = flexibility;
        this.created = created;
    }
}

// Simulation Result Structure
class GoalSimulationResult {
    constructor() {
        this.probabilityOfSuccess = 0; // 0-100%
        this.medianValue = 0;
        this.percentile10 = 0; // Worst 10%
        this.percentile90 = 0; // Best 10%
        this.baselineValue = 0; // Deterministic projection
        this.simulationPaths = []; // Array of year-by-year values
        this.finalValues = []; // All 10,000 final values
        this.shortfall = 0; // If median < target
        this.surplus = 0; // If median > target
    }
}

// ========================================
// MONTE CARLO ENGINE WITH CONTRIBUTIONS
// ========================================

/**
 * Run Monte Carlo simulation for financial goal
 * 
 * @param {Object} params
 * @param {number} params.currentSavings - Starting amount
 * @param {number} params.monthlyContribution - Monthly addition
 * @param {number} params.annualReturn - Expected annual return (e.g., 0.065 for 6.5%)
 * @param {number} params.annualVolatility - Annual volatility (e.g., 0.14 for 14%)
 * @param {number} params.years - Time horizon
 * @param {number} params.targetAmount - Goal target
 * @param {number} params.numSimulations - Default 10,000
 * @returns {GoalSimulationResult}
 */
function runGoalMonteCarloSimulation({
    currentSavings,
    monthlyContribution,
    annualReturn,
    annualVolatility,
    years,
    targetAmount,
    numSimulations = 10000
}) {
    
    const result = new GoalSimulationResult();
    
    // Convert to monthly parameters
    const monthlyReturn = annualReturn / 12;
    const monthlyVolatility = annualVolatility / Math.sqrt(12);
    const totalMonths = years * 12;
    
    console.log('🎲 Running Goal Monte Carlo Simulation:');
    console.log(`   Initial: $${currentSavings.toLocaleString()}`);
    console.log(`   Monthly: $${monthlyContribution.toLocaleString()}`);
    console.log(`   Return: ${(annualReturn * 100).toFixed(2)}% annual`);
    console.log(`   Volatility: ${(annualVolatility * 100).toFixed(2)}% annual`);
    console.log(`   Horizon: ${years} years`);
    console.log(`   Target: $${targetAmount.toLocaleString()}`);
    
    // Store all final values for percentile calculation
    const allFinalValues = [];
    
    // Store sample paths for visualization (every 100th simulation)
    const samplePaths = [];
    
    // Run simulations
    for (let sim = 0; sim < numSimulations; sim++) {
        let balance = currentSavings;
        const path = [balance];
        
        // Simulate month by month
        for (let month = 1; month <= totalMonths; month++) {
            // Generate random return using Box-Muller transform
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const randomReturn = monthlyReturn + monthlyVolatility * z;
            
            // Update balance with return and contribution
            balance = balance * (1 + randomReturn) + monthlyContribution;
            
            // Store year-end values
            if (month % 12 === 0) {
                path.push(balance);
            }
        }
        
        allFinalValues.push(balance);
        
        // Store sample paths for visualization
        if (sim % 100 === 0) {
            samplePaths.push(path);
        }
    }
    
    // Sort final values for percentile calculation
    allFinalValues.sort((a, b) => a - b);
    
    // Calculate statistics
    result.finalValues = allFinalValues;
    result.percentile10 = allFinalValues[Math.floor(numSimulations * 0.10)];
    result.medianValue = allFinalValues[Math.floor(numSimulations * 0.50)];
    result.percentile90 = allFinalValues[Math.floor(numSimulations * 0.90)];
    
    // Calculate probability of success
    const successfulSimulations = allFinalValues.filter(v => v >= targetAmount).length;
    result.probabilityOfSuccess = (successfulSimulations / numSimulations) * 100;
    
    // Calculate baseline (deterministic) projection
    result.baselineValue = calculateDeterministicProjection(
        currentSavings,
        monthlyContribution,
        annualReturn,
        years
    );
    
    // Calculate shortfall or surplus
    if (result.medianValue < targetAmount) {
        result.shortfall = targetAmount - result.medianValue;
    } else {
        result.surplus = result.medianValue - targetAmount;
    }
    
    // Store simulation paths
    result.simulationPaths = samplePaths;
    
    console.log('✅ Simulation Complete:');
    console.log(`   Median: $${result.medianValue.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
    console.log(`   10th %ile: $${result.percentile10.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
    console.log(`   90th %ile: $${result.percentile90.toLocaleString('en-US', {maximumFractionDigits: 0})}`);
    console.log(`   Success Rate: ${result.probabilityOfSuccess.toFixed(1)}%`);
    
    return result;
}

/**
 * Calculate deterministic (baseline) projection
 * This is the "average case" without randomness
 */
function calculateDeterministicProjection(initialAmount, monthlyContribution, annualReturn, years) {
    const monthlyRate = annualReturn / 12;
    const totalMonths = years * 12;
    
    // Future value of lump sum
    const futureValueLumpSum = initialAmount * Math.pow(1 + monthlyRate, totalMonths);
    
    // Future value of annuity (monthly contributions)
    const futureValueAnnuity = monthlyContribution * 
        ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    
    return futureValueLumpSum + futureValueAnnuity;
}

/**
 * Calculate what monthly contribution is needed to reach goal
 * (Descriptive only - NOT advice)
 */
function calculateRequiredContribution(currentSavings, targetAmount, annualReturn, years) {
    const monthlyRate = annualReturn / 12;
    const totalMonths = years * 12;
    
    // Future value of lump sum
    const futureValueLumpSum = currentSavings * Math.pow(1 + monthlyRate, totalMonths);
    
    // Required future value from contributions
    const requiredFromContributions = targetAmount - futureValueLumpSum;
    
    if (requiredFromContributions <= 0) {
        return 0; // Already have enough
    }
    
    // Solve for monthly contribution
    const monthlyContribution = requiredFromContributions * monthlyRate / 
        (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    return monthlyContribution;
}

// ========================================
// GOAL PERSISTENCE (localStorage)
// ========================================

function saveGoal(goal) {
    const goals = loadAllGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    
    if (index >= 0) {
        goals[index] = goal;
    } else {
        goals.push(goal);
    }
    
    localStorage.setItem('financialGoals', JSON.stringify(goals));
    console.log('💾 Goal saved:', goal.name);
}

function loadAllGoals() {
    const saved = localStorage.getItem('financialGoals');
    if (!saved) return [];
    
    try {
        return JSON.parse(saved);
    } catch (e) {
        console.error('Error loading goals:', e);
        return [];
    }
}

function deleteGoal(goalId) {
    const goals = loadAllGoals();
    const filtered = goals.filter(g => g.id !== goalId);
    localStorage.setItem('financialGoals', JSON.stringify(filtered));
    console.log('🗑️ Goal deleted:', goalId);
}

// ========================================
// EXPORT MODULE
// ========================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GOAL_TYPES,
        FinancialGoal,
        GoalSimulationResult,
        runGoalMonteCarloSimulation,
        calculateDeterministicProjection,
        calculateRequiredContribution,
        saveGoal,
        loadAllGoals,
        deleteGoal
    };
}
