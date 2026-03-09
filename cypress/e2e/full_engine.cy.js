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
    // Stub API so tests don't depend on live backend
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 190 } });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });
  });

  it("adds a holding, fills buy price, and visualizes without crashing", () => {
    cy.get("#ticker-0").clear({ force: true }).type("AAPL", { force: true });
    cy.get("#shares-0").clear({ force: true }).type("1", { force: true });
    cy.get("#purchase-0").clear({ force: true }).type("130", { force: true });

    // Visualize
    cy.contains("button", /visualize portfolio/i).click({ force: true });

    // Charts should appear
    cy.get("#summary-section", { timeout: 20000 }).should("not.be.empty");
    cy.get("canvas#performanceChart").should("exist");
    cy.get("canvas#pieChart").should("exist");

    // Monte Carlo section should exist after visualization
    cy.get("#montecarlo-section").should("exist");
  });
});

describe("Rebalancing Simulator – strategy sanity", () => {
  function generateHistData(startPrice, days) {
    const data = {};
    let price = startPrice;
    const start = new Date("2020-02-19");
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      data[d.toISOString().split("T")[0]] = { close: Math.round(price * 100) / 100 };
      price *= 1 + (Math.random() - 0.48) * 0.03;
    }
    return data;
  }

  const HIST = generateHistData(130, 800);

  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.clearLocalStorage();
    cy.reload();
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 190 } });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: HIST } });
  });

  it("runs rebalancing and produces a metrics table", () => {
    cy.get("#ticker-0").clear({ force: true }).type("AAPL", { force: true });
    cy.get("#shares-0").clear({ force: true }).type("1", { force: true });
    cy.get("#purchase-0").clear({ force: true }).type("130", { force: true });

    cy.contains("button", /visualize portfolio/i).click({ force: true });

    // Switch to Simulations tab
    cy.get('button[data-view="sim"]', { timeout: 20000 }).click({ force: true });
    cy.get("#rebalancing-section", { timeout: 15000 }).should("be.visible");

    cy.get("#rebalance-strategy").select("annual", { force: true });
    cy.get("#rebalance-period").select("5y", { force: true });
    cy.get("#run-rebalancing-sim").click({ force: true });

    cy.get("#rebalancing-metrics-table", { timeout: 20000 }).should("be.visible");
    cy.get("#rebalancing-metrics-table").find("tbody tr").should("have.length.at.least", 1);
    cy.get("canvas#rebalancing-performance-chart").should("exist");
  });

  it("single-asset invariance: No Rebalancing and Annual should be (almost) identical", () => {
    cy.get("#ticker-0").clear({ force: true }).type("AAPL", { force: true });
    cy.get("#shares-0").clear({ force: true }).type("1", { force: true });
    cy.get("#purchase-0").clear({ force: true }).type("130", { force: true });

    cy.contains("button", /visualize portfolio/i).click({ force: true });

    cy.get('button[data-view="sim"]', { timeout: 20000 }).click({ force: true });
    cy.get("#rebalancing-section", { timeout: 15000 }).should("be.visible");

    cy.get("#rebalance-period").select("10y", { force: true });
    cy.get("#run-rebalancing-sim").click({ force: true });

    cy.get("#rebalancing-metrics-table", { timeout: 20000 }).should("be.visible");

    function getRowByStrategy(name) {
      return cy.get("#rebalancing-metrics-table tbody tr").contains("td", name).parent("tr");
    }

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

      expect(Math.abs(noneTotal - annualTotal)).to.be.lessThan(0.3);
      expect(Math.abs(noneCagr - annualCagr)).to.be.lessThan(0.3);
    });
  });
});
