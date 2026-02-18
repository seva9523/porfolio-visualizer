// cypress/e2e/themes/themes_basic.cy.js
//
// Tests for basic Theme & Trend Explorer functionality:
// - Page loading
// - Grid rendering  
// - Theme cards
// - Dark mode
// - Navigation

describe("Theme Explorer - Basic Functionality", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  it("page loads and shows welcome section", () => {
    cy.get('[data-testid="welcome-section"]').should('exist');
    cy.contains('What is a Market Theme').should('be.visible');
  });

  it("displays core-first educational banner", () => {
    cy.get('[data-testid="core-banner"]').should('be.visible');
    cy.contains('core portfolio first').should('exist');
  });

  it("themes grid exists and has expected count", () => {
    cy.get('[data-testid="themes-grid"]').should('exist');
    
    // Should have exactly 38 themes (11 original + 27 new)
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });

  it("each theme card displays core elements", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      // Should have category tag
      cy.get('.ctag').should('exist');
      
      // Should have theme name
      cy.get('.tcard-name').should('exist').and('not.be.empty');
      
      // Should have description
      cy.get('.tcard-desc').should('exist').and('not.be.empty');
      
      // Should have metrics (4 metric boxes)
      cy.get('.tmet').should('have.length', 4);
      
      // Should have trend bar
      cy.get('.sbar').should('exist');
    });
  });

  it("theme cards show risk pills", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      // Should have at least one risk pill
      cy.get('.rpill').should('exist');
    });
  });

  it("theme cards show core vs satellite classification", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      // Should have either cs-core or cs-sat pill
      cy.get('.cs-pill').should('exist');
    });
  });

  it("theme cards show 'how it feels' indicator", () => {
    cy.get('[data-testid="theme-card"]').first().within(() => {
      cy.get('.feel-meter').should('exist');
    });
  });

  it("dark mode toggle works", () => {
    // Should start in light mode
    cy.get('body').should('not.have.class', 'dark-mode');
    
    // Toggle to dark mode
    cy.get('#dtog').click();
    cy.get('body').should('have.class', 'dark-mode');
    
    // Toggle back to light mode
    cy.get('#dtog').click();
    cy.get('body').should('not.have.class', 'dark-mode');
  });

  it("dark mode persists after reload", () => {
    cy.get('#dtog').click();
    cy.get('body').should('have.class', 'dark-mode');
    
    cy.reload();
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    
    cy.get('body').should('have.class', 'dark-mode');
  });

  it("navigation links to other tools work", () => {
    // Check Portfolio Visualizer link
    cy.contains('a', 'Portfolio Visualizer').should('have.attr', 'href', '/');
    
    // Check Goals Simulator link
    cy.contains('a', 'Goals Simulator').should('have.attr', 'href', '/goals.html');
  });

  it("diagnostics panel toggles open and closed", () => {
    cy.get('[data-testid="diagnostics-toggle"]')
      .scrollIntoView()
      .should('be.visible')
      .click();
    
    cy.get('[data-testid="diagnostics-panel"]').should('be.visible');
    
    // Click again to close
    cy.get('[data-testid="diagnostics-toggle"]').click();
    cy.get('[data-testid="diagnostics-panel"]').should('not.be.visible');
  });

  it("diagnostics panel shows theme count", () => {
    cy.get('[data-testid="diagnostics-toggle"]')
      .scrollIntoView()
      .click();
    
    cy.get('[data-testid="diagnostics-panel"]')
      .should('contain', '38'); // Theme count
  });

  it("handles theme JSON load failure gracefully", () => {
    cy.visit(`${BASE_URL}/themes.html`);
    
    // Intercept and fail the themes.json request
    cy.intercept('GET', '/data/themes.json', {
      statusCode: 404,
      body: 'Not found'
    }).as('themesLoad');
    
    cy.reload();
    
    // Should show offline badge
    cy.get('#offline-badge', { timeout: 5000 }).should('be.visible');
    
    // Retry button should be visible
    cy.get('#retry-load-btn').should('be.visible');
  });

  it("shows loading spinner during data fetch", () => {
    cy.visit(`${BASE_URL}/themes.html`);
    
    // Loading bar should be visible initially
    cy.get('#load-bar').should('be.visible');
    cy.contains('Loading themes').should('be.visible');
  });

  it("trending badge appears on hot themes", () => {
    // At least one theme should have the trending badge
    cy.get('[data-testid="trending-badge"]', { timeout: 5000 })
      .should('exist');
  });

  it("freshness badges display on cards", () => {
    cy.get('.fresh-badge').should('exist');
  });

  it("hype badges display on cards", () => {
    cy.get('.hype-badge').should('exist');
  });

});
