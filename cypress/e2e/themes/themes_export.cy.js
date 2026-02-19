// cypress/e2e/themes/themes_export.cy.js

describe("Theme Explorer - Export", () => {
  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    cy.wait(2000);
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("export buttons exist", () => {
    cy.get('[data-testid="beginner-csv-btn"]').should('exist');
    cy.get('[data-testid="export-csv-btn"]').should('exist');
  });
});
