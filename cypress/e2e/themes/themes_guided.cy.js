// cypress/e2e/themes/themes_guided.cy.js
describe("Theme Explorer — Guided Wizard & Help", () => {
  function waitForPageReady() {
    cy.get("#load-bar", { timeout: 30000 }).should("not.be.visible");
    cy.get('[data-testid="theme-card"]', { timeout: 25000 }).should("have.length.greaterThan", 10);
    cy.get("body").then(($b) => {
      if ($b.find('[data-testid="onboarding-modal"]:visible').length)
        cy.get('[data-testid="onboarding-modal"]').find("button").first().click({ force: true });
    });
    cy.wait(3000);
  }

  beforeEach(() => { cy.visit("/themes.html"); waitForPageReady(); });

  it("UX-003: Help Me Choose button exists and opens guide", () => {
    cy.get('[data-testid="help-choose-btn"]').should("exist").and("be.visible");
    cy.get('[data-testid="help-choose-btn"]').click({ force: true });
    cy.wait(500);
    // The guide overlay has data-testid="guided-mode" (not "guide-overlay")
    cy.get('[data-testid="guided-mode"]').should("be.visible");
  });

  it("UX-014: educational disclaimers are visible", () => {
    cy.contains("not tell you what to buy").should("exist");
    cy.contains("not investment advice").should("exist");
  });

  it("UX-004: What is a Market Theme section is visible", () => {
    cy.contains("What is a Market Theme").should("exist");
  });
});
