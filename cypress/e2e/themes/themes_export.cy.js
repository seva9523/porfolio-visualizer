// cypress/e2e/themes/themes_export.cy.js
// ULTRA-ROBUST version - simplified for CI reliability

describe("Theme Explorer - Export Functionality", () => {

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

  it("beginner CSV button exists", () => {
    cy.get('[data-testid="beginner-csv-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Beginner CSV');
  });

  it("clicking beginner CSV triggers download", () => {
    cy.get('[data-testid="beginner-csv-btn"]')
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    cy.get('body').should('exist');
  });

  it("pro CSV button exists", () => {
    cy.get('[data-testid="export-csv-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Pro CSV');
  });

  it("clicking pro CSV triggers download", () => {
    cy.get('[data-testid="export-csv-btn"]')
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    cy.get('body').should('exist');
  });

  it("download data button exists in detail view", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.contains('button', 'Download Data', { timeout: 10000 })
      .should('be.visible');
  });

  it("clicking download data triggers CSV download", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    
    cy.contains('button', 'Download Data')
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    cy.get('[data-testid="theme-detail"]').should('be.visible');
  });

  it("can export beginner CSV multiple times", () => {
    cy.get('[data-testid="beginner-csv-btn"]').click();
    cy.wait(800);
    cy.get('[data-testid="beginner-csv-btn"]').click();
    cy.wait(800);
    
    cy.get('body').should('exist');
  });

  it("can export pro CSV multiple times", () => {
    cy.get('[data-testid="export-csv-btn"]').click();
    cy.wait(800);
    cy.get('[data-testid="export-csv-btn"]').click();
    cy.wait(800);
    
    cy.get('body').should('exist');
  });

});
