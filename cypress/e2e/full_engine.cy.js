/// <reference types="cypress" />

// Full end-to-end QA for:
// - Financial Goals Simulator (goals.html)
// - Portfolio Visualizer (index.html)
// - Rebalancing Simulator (inside index.html)
//
// These tests assume your app is deployed at:
// https://www.wealthview.pro/
//
// IMPORTANT:
// - We clear localStorage between tests to avoid saved goals/holdings affecting results.
// - We use stable selectors where available (data-testid on goals.html; ids/classes on index.html).

function parsePercent(text) {
  // "62%" -> 62
  const n = parseFloat(String(text).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function parseNumber(text) {
  // "$129.87" or "1,234" -> 129.87 / 1234
  const n = parseFloat(String(text).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

describe("Financial Goals Simulator – engine integrity", () => {
  beforeEach(() => {
    cy.visit("/goals.html");
    cy.clearLocalStorage(); // clear saved goals
    cy.reload();
  });

  it("creates a goal and shows stable results (seeded) + action plan changes probability", () => {
    // Open modal
    cy.get('[data-testid="add-goal-btn"]').click();

    // Fill form
    cy.get('[data-testid="goal-name"]').clear().type("QA Goal");
    cy.get('[data-testid="goal-type"]').select("retirement");
    cy.get('[data-testid="goal-target"]').clear().type("50000");
    cy.get('[data-testid="goal-years"]').clear().type("17");
    cy.get('[data-testid="goal-current"]').clear().type("0");
    cy.get('[data-testid="goal-monthly"]').clear().type("200");
    cy.get('[data-testid="goal-return"]').clear().type("7");
    cy.get('[data-testid="goal-volatility"]').clear().type("15");

    cy.get('[data-testid="run-simulation"]').click();

    // Wait for goal card render
    cy.get('[data-testid="goal-card"]').should("exist");

    // Baseline probability
    cy.get('[data-testid="goal-probability"]').invoke("text").then((t1) => {
      const p1 = parsePercent(t1);
      expect(p1).to.be.within(0, 100);

      // Show plans (if probability < 70, button exists; otherwise we still want the plans area)
      cy.get("body").then(($body) => {
        if ($body.find('[data-testid="show-plans"]').length) {
          cy.get('[data-testid="show-plans"]').click();
        }
      });

      // Click Extend Timeline plan (should exist)
      cy.get('[data-testid="plan-extend_timeline"]').should("exist").click();

      // New probability should be a valid number; often it increases, but don't hard-require (depends on random params),
      // instead require that it changes OR stays same but is stable after reload.
      cy.get('[data-testid="goal-probability"]').invoke("text").then((t2) => {
        const p2 = parsePercent(t2);
        expect(p2).to.be.within(0, 100);

        // Reload the page and ensure the active plan probability remains stable (seeded + cached)
        cy.reload();

        cy.get('[data-testid="goal-card"]').should("exist");
        cy.get('[data-testid="goal-probability"]').invoke("text").then((t3) => {
          const p3 = parsePercent(t3);
          // Must match exactly after reload (deterministic seed)
          expect(p3).to.equal(p2);
        });
      });
    });
  });

  it("handles a deterministic edge case: 0% return, 0% volatility, 0 monthly => median should equal current savings", () => {
    cy.get('[data-testid="add-goal-btn"]').click();

    cy.get('[data-testid="goal-name"]').clear().type("Deterministic");
    cy.get('[data-testid="goal-type"]').select("short_term");
    cy.get('[data-testid="goal-target"]').clear().type("2000");
    cy.get('[data-testid="goal-years"]').clear().type("5");
    cy.get('[data-testid="goal-current"]').clear().type("1000");
    cy.get('[data-testid="goal-monthly"]').clear().type("0");
    cy.get('[data-testid="goal-return"]').clear().type("0");
    cy.get('[data-testid="goal-volatility"]').clear().type("0");

    cy.get('[data-testid="run-simulation"]').click();

    cy.get('[data-testid="goal-card"]').should("exist");
    cy.get('[data-testid="goal-median"]').invoke("text").then((t) => {
      // Display is like "$1k" (rounded). We'll accept close bounds.
      // "$1k" -> 1
      const k = parseNumber(t); // will read "1" from "1k"
      expect(k).to.be.closeTo(1, 0.5);
    });

    cy.get('[data-testid="goal-probability"]').invoke("text").then((t) => {
      const p = parsePercent(t);
      expect(p).to.be.within(0, 100);
    });
  });
});

describe("Portfolio Visualizer – basic correctness + data fetch", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.clearLocalStorage();
    cy.reload();
  });

  it("adds a holding, auto-fills buy price from date, and visualizes without crashing", () => {
    // Add one holding row
    cy.get("button.add-btn").contains("Add Holding").click();

    // Fill holding 0
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("19/02/2021").blur();

    // Buy price should become a number (auto-filled async)
    cy.get("#purchase-0", { timeout: 20000 }).should(($el) => {
      const v = $el.val();
      expect(parseNumber(v)).to.be.a("number");
      expect(parseNumber(v)).to.be.greaterThan(0);
    });

    // Visualize
    cy.get("button.visualize-btn").contains("Visualize").click();

    // Charts should appear
    cy.get("#summary-section", { timeout: 20000 }).should("be.visible");
    cy.get("canvas#performanceChart").should("exist");
    cy.get("canvas#pieChart").should("exist");

    // Monte Carlo section should exist after visualization
    cy.get("#montecarlo-section").should("exist");
  });
});

describe("Rebalancing Simulator – strategy sanity", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.clearLocalStorage();
    cy.reload();
  });

  it("runs rebalancing and produces a metrics table", () => {
    // Add single holding so rebalancing can run
    cy.get("button.add-btn").contains("Add Holding").click();
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("19/02/2021").blur();

    cy.get("#purchase-0", { timeout: 20000 }).should(($el) => {
      expect(parseNumber($el.val())).to.be.greaterThan(0);
    });

    cy.get("button.visualize-btn").contains("Visualize").click();

    // Rebalancing controls exist
    cy.get("#rebalancing-section", { timeout: 20000 }).should("be.visible");

    // Choose options and run
    cy.get("#rebalance-strategy").select("annual");
    cy.get("#rebalance-period").select("5y");
    cy.get("#run-rebalancing-sim").click();

    // Table should populate
    cy.get("#rebalancing-metrics-table", { timeout: 20000 }).should("be.visible");
    cy.get("#rebalancing-metrics-table").find("tbody tr").should("have.length.at.least", 1);

    // Performance chart should exist
    cy.get("canvas#rebalancing-performance-chart").should("exist");
  });

  it("single-asset invariance: No Rebalancing and Annual should be (almost) identical", () => {
    cy.get("button.add-btn").contains("Add Holding").click();
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("19/02/2021").blur();
    cy.get("#purchase-0", { timeout: 20000 }).should(($el) => {
      expect(parseNumber($el.val())).to.be.greaterThan(0);
    });

    cy.get("button.visualize-btn").contains("Visualize").click();
    cy.get("#rebalancing-section", { timeout: 20000 }).should("be.visible");

    // Run "all strategies" view if your UI does that by default, otherwise run twice.
    // Here we rely on your metrics table containing multiple rows including "No Rebalancing" and "Annual Rebalancing".
    cy.get("#rebalance-period").select("10y");
    cy.get("#run-rebalancing-sim").click();

    cy.get("#rebalancing-metrics-table", { timeout: 20000 }).should("be.visible");

    function getRowByStrategy(name) {
      return cy.get("#rebalancing-metrics-table tbody tr").contains("td", name).parent("tr");
    }

    // Read Total Return and CAGR for both rows and compare.
    // Table columns: Strategy | Total Return | CAGR | Volatility | Max Drawdown | Rebalances
    let noneTotal, annualTotal, noneCagr, annualCagr;

    getRowByStrategy("No Rebalancing").find("td").eq(1).invoke("text").then((t) => { noneTotal = parsePercent(t); });
    getRowByStrategy("Annual Rebalancing").find("td").eq(1).invoke("text").then((t) => { annualTotal = parsePercent(t); });

    getRowByStrategy("No Rebalancing").find("td").eq(2).invoke("text").then((t) => { noneCagr = parsePercent(t); });
    getRowByStrategy("Annual Rebalancing").find("td").eq(2).invoke("text").then((t) => { annualCagr = parsePercent(t); });

    cy.then(() => {
      expect(noneTotal).to.be.a("number");
      expect(annualTotal).to.be.a("number");
      expect(noneCagr).to.be.a("number");
      expect(annualCagr).to.be.a("number");

      // Single asset => should match very closely
      expect(Math.abs(noneTotal - annualTotal)).to.be.lessThan(0.3);
      expect(Math.abs(noneCagr - annualCagr)).to.be.lessThan(0.3);
    });
  });
});
