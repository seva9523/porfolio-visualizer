// cypress/e2e/themes/themes_compare.cy.js
// MINIMAL - Only critical tests with force:true

describe("Theme Explorer - Compare", () => {

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

  it("compare mode activates", () => {
    cy.get('[data-testid="compare-toggle"]').click({ force: true });
    cy.wait(1500);
    cy.get('#cmp-bar').should('exist');
  });

  it("can select themes", () => {
    cy.get('[data-testid="compare-toggle"]').click({ force: true });
    cy.wait(1500);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(500);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(500);
    
    cy.get('[data-testid="compare-count"]').should('contain', '2');
  });

});
