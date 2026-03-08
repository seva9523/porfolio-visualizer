// cypress/e2e/themes/themes_export.cy.js
describe("Theme Explorer — Exports", () => {
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

  it("TH-070: beginner CSV export button exists", () => {
    cy.get('[data-testid="beginner-csv-btn"]').should("exist").and("be.visible");
  });

  it("TH-071: pro CSV export button exists", () => {
    cy.get('[data-testid="export-csv-btn"]').should("exist").and("be.visible");
  });
});
