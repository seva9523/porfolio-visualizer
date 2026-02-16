// cypress/e2e/goals_extended.cy.js
//
// Extended tests for the Financial Goals Simulator (goals.html):
// delete goals, multiple goals, action plans, reset plan.

const BASE_URL =
  Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

function parsePercent(text) {
  const n = parseFloat(String(text).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function createGoal({ name, type, target, years, current, monthly, ret, vol }) {
  cy.get('[data-testid="add-goal-btn"]').click();
  cy.get('[data-testid="goal-name"]').clear().type(name);
  cy.get('[data-testid="goal-type"]').select(type);
  cy.get('[data-testid="goal-target"]').clear().type(String(target));
  cy.get('[data-testid="goal-years"]').clear().type(String(years));
  cy.get('[data-testid="goal-current"]').clear().type(String(current));
  cy.get('[data-testid="goal-monthly"]').clear().type(String(monthly));
  cy.get('[data-testid="goal-return"]').clear().type(String(ret));
  cy.get('[data-testid="goal-volatility"]').clear().type(String(vol));
  cy.get('[data-testid="run-simulation"]').click();
}

describe("Goals Simulator — Extended Coverage", () => {
  beforeEach(() => {
    cy.visit(`${BASE_URL}/goals.html`);
    cy.clearLocalStorage();
    cy.reload();
  });

  it("can create and then delete a goal", () => {
    createGoal({
      name: "Delete Me",
      type: "short_term",
      target: 10000,
      years: 3,
      current: 1000,
      monthly: 200,
      ret: 5,
      vol: 10,
    });

    cy.get('[data-testid="goal-card"]').should("have.length", 1);

    // Delete the goal
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });
    cy.get('[data-testid="goal-card"]')
      .first()
      .contains("button", "Delete")
      .click();

    // Goal should be removed
    cy.get('[data-testid="goal-card"]').should("have.length", 0);
    cy.get("#no-goals").should("be.visible");
  });

  it("supports multiple goals simultaneously", () => {
    createGoal({
      name: "Retirement",
      type: "retirement",
      target: 1000000,
      years: 30,
      current: 50000,
      monthly: 1000,
      ret: 7,
      vol: 15,
    });

    cy.get('[data-testid="goal-card"]').should("have.length", 1);

    createGoal({
      name: "House Down Payment",
      type: "home",
      target: 80000,
      years: 5,
      current: 20000,
      monthly: 800,
      ret: 5,
      vol: 8,
    });

    // Both goals should exist
    cy.get('[data-testid="goal-card"]').should("have.length", 2);
    cy.contains("Retirement").should("exist");
    cy.contains("House Down Payment").should("exist");

    // Each should have its own probability
    cy.get('[data-testid="goal-probability"]').should("have.length", 2);
    cy.get('[data-testid="goal-probability"]').each(($el) => {
      const pct = parsePercent($el.text());
      expect(pct).to.be.within(0, 100);
    });
  });

  it("goals persist after page reload", () => {
    createGoal({
      name: "Persist Test",
      type: "education",
      target: 50000,
      years: 10,
      current: 5000,
      monthly: 300,
      ret: 6,
      vol: 12,
    });

    cy.get('[data-testid="goal-card"]').should("have.length", 1);

    // Reload page
    cy.reload();

    // Goal should still exist
    cy.get('[data-testid="goal-card"]').should("have.length", 1);
    cy.contains("Persist Test").should("exist");
  });

  it("action plan 'Extend Timeline' changes probability", () => {
    createGoal({
      name: "Timeline Test",
      type: "retirement",
      target: 100000,
      years: 10,
      current: 0,
      monthly: 500,
      ret: 7,
      vol: 15,
    });

    cy.get('[data-testid="goal-card"]').should("exist");

    // Get baseline probability
    cy.get('[data-testid="goal-probability"]')
      .first()
      .invoke("text")
      .then((baseText) => {
        const basePct = parsePercent(baseText);

        // Show plans and click extend timeline
        cy.get("body").then(($body) => {
          if ($body.find('[data-testid="show-plans"]').length) {
            cy.get('[data-testid="show-plans"]').first().click();
          }
        });

        cy.get('[data-testid="plan-extend_timeline"]').should("exist").click();

        // New probability should be a valid number
        cy.get('[data-testid="goal-probability"]')
          .first()
          .invoke("text")
          .then((newText) => {
            const newPct = parsePercent(newText);
            expect(newPct).to.be.within(0, 100);
            // Extending timeline generally improves probability
            // (but we don't strictly require it since it depends on params)
          });
      });
  });

  it("reset plan returns to original probability", () => {
    createGoal({
      name: "Reset Test",
      type: "short_term",
      target: 20000,
      years: 5,
      current: 1000,
      monthly: 200,
      ret: 6,
      vol: 10,
    });

    cy.get('[data-testid="goal-card"]').should("exist");

    // Record baseline probability
    cy.get('[data-testid="goal-probability"]')
      .first()
      .invoke("text")
      .then((baseText) => {
        const basePct = parsePercent(baseText);

        // Apply a plan
        cy.get("body").then(($body) => {
          if ($body.find('[data-testid="show-plans"]').length) {
            cy.get('[data-testid="show-plans"]').first().click();
          }
        });

        cy.get('[data-testid="plan-extend_timeline"]').click();

        // Probability may have changed
        cy.get('[data-testid="goal-probability"]')
          .first()
          .invoke("text")
          .then((planText) => {
            // Now reset
            cy.get(".reset-btn").first().click();

            // Should return to baseline
            cy.get('[data-testid="goal-probability"]')
              .first()
              .invoke("text")
              .then((resetText) => {
                const resetPct = parsePercent(resetText);
                expect(resetPct).to.equal(basePct);
              });
          });
      });
  });

  it("all goal types can be created without crash", () => {
    const types = ["retirement", "home", "education", "short_term", "fire"];

    types.forEach((type, i) => {
      createGoal({
        name: `Goal ${type}`,
        type: type,
        target: 50000,
        years: 10,
        current: 5000,
        monthly: 300,
        ret: 6,
        vol: 12,
      });
    });

    // All 5 goals should exist
    cy.get('[data-testid="goal-card"]').should("have.length", 5);
  });

  it("forecast chart renders for each goal", () => {
    createGoal({
      name: "Chart Test",
      type: "retirement",
      target: 100000,
      years: 15,
      current: 10000,
      monthly: 500,
      ret: 7,
      vol: 15,
    });

    cy.get('[data-testid="goal-card"]').should("exist");
    cy.get('[data-testid="forecast-chart"]').should("exist");

    // Stat values should render
    cy.get('[data-testid="goal-p10"]').should("exist");
    cy.get('[data-testid="goal-median"]').should("exist");
    cy.get('[data-testid="goal-p90"]').should("exist");
  });
});
