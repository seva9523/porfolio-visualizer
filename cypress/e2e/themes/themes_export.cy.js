// cypress/e2e/themes/themes_export.cy.js
// MINIMAL - Only critical tests with force:true

describe("Theme Explorer - Export", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.exist');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    cy.wait(2000);
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("beginner CSV button exists", () => {
    cy.get('[data-testid="beginner-csv-btn"]').should('exist');
  });

  it("pro CSV button exists", () => {
    cy.get('[data-testid="export-csv-btn"]').should('exist');
  });

});
