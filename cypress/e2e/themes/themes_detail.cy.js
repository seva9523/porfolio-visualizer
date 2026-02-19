// cypress/e2e/themes/themes_detail.cy.js

describe("Theme Explorer - Detail", () => {
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

  it("opens detail view", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(3000);
    cy.get('[data-testid="theme-detail"]').should('exist');
  });
});
