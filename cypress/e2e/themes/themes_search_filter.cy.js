// cypress/e2e/themes/themes_search_filter.cy.js

describe("Theme Explorer - Search", () => {
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

  it("search works", () => {
    cy.get('[data-testid="theme-search"]').clear({ force: true }).type("income", { force: true });
    cy.wait(1500);
    cy.get('[data-testid="theme-card"]').its("length").should("be.greaterThan", 0);
  });
});
