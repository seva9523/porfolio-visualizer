// cypress/e2e/themes/themes_basic.cy.js
//
// ULTRA-ROBUST version with generous waits for CI

describe("Theme Explorer - Basic Functionality", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    cy.wait(1000); // CI settling time
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("page loads and shows welcome section", () => {
    cy.get('[data-testid="welcome-section"]').should('exist');
    cy.contains('What is a Market Theme').should('be.visible');
  });

  it("displays core-first educational banner", () => {
    cy.get('[data-testid="core-banner"]').should('be.visible');
  });

  it("themes grid exists and has expected count", () => {
    cy.get('[data-testid="themes-grid"]').should('exist');
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });

  it("each theme card displays core elements", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      cy.get('.ctag').should('exist');
      cy.get('.tcard-name').should('exist').and('not.be.empty');
      cy.get('.tcard-desc').should('exist').and('not.be.empty');
      cy.get('.tmet').should('have.length', 4);
      cy.get('.sbar').should('exist');
    });
  });

  it("theme cards show risk pills", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      cy.get('.rpill').should('exist');
    });
  });

  it("theme cards show core vs satellite classification", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      cy.get('.cs-pill').should('exist');
    });
  });

  it("dark mode toggle works", () => {
    cy.get('body').should('not.have.class', 'dark-mode');
    cy.get('#dtog').click();
    cy.wait(500);
    cy.get('body').should('have.class', 'dark-mode');
  });

  it("navigation links to other tools work", () => {
    cy.contains('a', 'Portfolio Visualizer').should('have.attr', 'href', '/');
    cy.contains('a', 'Goals Simulator').should('have.attr', 'href', '/goals.html');
  });

  it("diagnostics panel toggles", () => {
    cy.get('[data-testid="diagnostics-toggle"]')
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });
    
    cy.wait(500);
    cy.get('[data-testid="diagnostics-panel"]').should('be.visible');
  });

});
