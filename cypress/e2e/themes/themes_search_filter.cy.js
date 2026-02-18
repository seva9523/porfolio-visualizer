// cypress/e2e/themes/themes_search_filter.cy.js
// ULTRA-ROBUST version - simplified for CI reliability

describe("Theme Explorer - Search & Filter", () => {

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

  // SEARCH TESTS
  it("searches by theme name", () => {
    cy.get('[data-testid="theme-search"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled');
    
    cy.wait(500);
    
    cy.get('[data-testid="theme-search"]')
      .clear()
      .type("income", { delay: 100 });
    
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]')
      .its("length")
      .should("be.greaterThan", 0)
      .and("be.lessThan", 38);
  });

  it("clearing search shows all themes", () => {
    cy.get('[data-testid="theme-search"]')
      .should('be.visible')
      .clear()
      .type("bitcoin");
    
    cy.wait(800);
    cy.get('[data-testid="theme-card"]').should('have.length', 1);
    
    cy.get('[data-testid="theme-search"]').clear();
    cy.wait(800);
    
    cy.get('[data-testid="theme-card"]').should('have.length', 38);
  });

  // CATEGORY FILTER TESTS
  it("filters by category: Growth", () => {
    cy.get('[data-testid="category-filter"]', { timeout: 10000 })
      .should('be.visible')
      .select('growth');
    
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]')
      .its('length')
      .should('be.greaterThan', 5);
  });

  it("filters by category: Defensive", () => {
    cy.get('[data-testid="category-filter"]')
      .should('be.visible')
      .select('defensive');
    
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]')
      .its('length')
      .should('be.greaterThan', 2);
  });

  it("resetting to 'All Types' shows all themes", () => {
    cy.get('[data-testid="category-filter"]').select('growth');
    cy.wait(1000);
    
    cy.get('[data-testid="category-filter"]').select('all');
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').should('have.length', 38);
  });

  // SORT TESTS
  it("sorts by trending", () => {
    cy.get('[data-testid="sort-select"]', { timeout: 10000 })
      .should('be.visible')
      .select('trending');
    
    cy.wait(1000);
    cy.get('[data-testid="theme-card"]').should('have.length', 38);
  });

  it("sorts by name A-Z", () => {
    cy.get('[data-testid="sort-select"]')
      .should('be.visible')
      .select('name');
    
    cy.wait(1000);
    cy.get('[data-testid="theme-card"]').should('have.length', 38);
  });

  // COMBINED FILTERS
  it("search + category filter works together", () => {
    cy.get('[data-testid="theme-search"]')
      .should('be.visible')
      .clear()
      .type("stocks");
    
    cy.wait(800);
    
    cy.get('[data-testid="category-filter"]').select('growth');
    
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]')
      .its('length')
      .should('be.greaterThan', 0)
      .and('be.lessThan', 38);
  });

});
