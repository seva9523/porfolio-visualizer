// cypress/e2e/themes/themes_guided.cy.js
// MINIMAL - Only critical tests with force:true

describe("Theme Explorer - Guided", () => {

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

  it("help button exists", () => {
    cy.get('[data-testid="help-choose-btn"]').should('exist');
  });

  it("guided mode opens", () => {
    cy.get('[data-testid="help-choose-btn"]').click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="guided-mode"]').should('exist');
  });

});
