// cypress/e2e/themes/themes_basic.cy.js
// BULLETPROOF version with force:true on ALL interactions

describe("Theme Explorer - Basic", () => {

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

  it("page loads successfully", () => {
    cy.get('[data-testid="welcome-section"]').should('exist');
    cy.get('[data-testid="themes-grid"]').should('exist');
  });

  it("displays all 38 themes", () => {
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });

  it("dark mode works", () => {
    cy.get('#dtog').click({ force: true });
    cy.wait(1000);
    cy.get('body').should('have.class', 'dark-mode');
  });

  it("diagnostics opens", () => {
    cy.get('[data-testid="diagnostics-toggle"]').click({ force: true });
    cy.wait(1000);
    cy.get('[data-testid="diagnostics-panel"]').should('exist');
  });

});
