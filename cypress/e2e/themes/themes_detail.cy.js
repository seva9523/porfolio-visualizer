// cypress/e2e/themes/themes_detail.cy.js
// ULTRA-ROBUST version - simplified for CI reliability

describe("Theme Explorer - Detail View", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    cy.wait(1000);
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("clicking a theme card opens detail view", () => {
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .first()
      .should('be.visible');
    
    cy.wait(500);
    
    cy.get('[data-testid="theme-card"]').first().click({ force: true });

    cy.wait(2000); // Wait for navigation
    
    cy.get('[data-testid="theme-detail"]', { timeout: 10000 })
      .should('be.visible');
  });

  it("detail view shows back button", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="back-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Back to Themes');
  });

  it("back button returns to grid", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="back-btn"]', { timeout: 10000 })
      .should('be.visible')
      .click();
    
    cy.wait(1500);
    cy.get('#lv').should('be.visible');
  });

  it("shows theme name and category", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="theme-detail"]', { timeout: 10000 }).within(() => {
      cy.get('h2').should('exist').and('not.be.empty');
      cy.get('.ctag').should('exist');
    });
  });

  it("confidence card displays", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="confidence-card"]', { timeout: 5000 })
      .should('exist');
  });

  it("suitability section displays", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="suitability-section"]', { timeout: 5000 })
      .should('exist');
  });

  it("performance metrics section displays", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="theme-stats"]', { timeout: 5000 })
      .should('exist');
  });

  it("view toggle exists", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="view-toggle"]', { timeout: 5000 })
      .should('exist');
  });

  it("clicking detailed view shows additional content", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.get('[data-testid="view-toggle"]', { timeout: 5000 })
      .should('be.visible');
    
    cy.wait(500);
    
    cy.get('[data-testid="view-toggle"]')
      .find('button[data-mode="detailed"]')
      .should('be.visible')
      .click({ force: true });

    cy.wait(1000);
    
    cy.get('.detailed-only.show', { timeout: 5000 }).should('exist');
  });

  it("can view different themes sequentially", () => {
    // View first theme
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="theme-detail"]').should('be.visible');
    
    // Go back
    cy.get('[data-testid="back-btn"]').click();
    cy.wait(1500);
    
    // View second theme
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="theme-detail"]').should('be.visible');
  });

});
