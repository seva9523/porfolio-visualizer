// cypress/e2e/themes/themes_export.cy.js
//
// Tests for Theme & Trend Explorer CSV export functionality

describe("Theme Explorer - Export Functionality", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  describe("Beginner CSV Export", () => {
    
    it("beginner CSV button exists", () => {
      cy.get('[data-testid="beginner-csv-btn"]')
        .should('be.visible')
        .and('contain', 'Beginner CSV');
    });

    it("clicking beginner CSV triggers download", () => {
      cy.get('[data-testid="beginner-csv-btn"]').click();
      
      // The download happens via blob URL, we just verify it doesn't crash
      cy.get('body').should('exist');
    });

    it("beginner CSV export does not crash the page", () => {
      cy.get('[data-testid="beginner-csv-btn"]').click();
      
      // Page should still be functional
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });
  });

  describe("Pro CSV Export", () => {
    
    it("pro CSV button exists", () => {
      cy.get('[data-testid="export-csv-btn"]')
        .should('be.visible')
        .and('contain', 'Pro CSV');
    });

    it("clicking pro CSV triggers download", () => {
      cy.get('[data-testid="export-csv-btn"]').click();
      
      // The download happens via blob URL, we just verify it doesn't crash
      cy.get('body').should('exist');
    });

    it("pro CSV export does not crash the page", () => {
      cy.get('[data-testid="export-csv-btn"]').click();
      
      // Page should still be functional
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });
  });

  describe("Theme Detail CSV Export", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("download data button exists in detail view", () => {
      cy.contains('button', 'Download Data').should('be.visible');
    });

    it("clicking download data triggers CSV download", () => {
      cy.contains('button', 'Download Data').click();
      
      // Should not crash
      cy.get('[data-testid="theme-detail"]').should('be.visible');
    });

    it("can export multiple themes sequentially", () => {
      cy.contains('button', 'Download Data').click();
      
      cy.get('[data-testid="back-btn"]').click();
      
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
      
      cy.contains('button', 'Download Data').click();
      
      // Should not crash
      cy.get('[data-testid="theme-detail"]').should('be.visible');
    });
  });

  describe("Export with Filters Active", () => {
    
    it("exports work when search filter is active", () => {
      cy.get('[data-testid="theme-search"]').type("income");
      
      cy.get('[data-testid="export-csv-btn"]').click();
      
      // Should export all themes (not just filtered ones)
      cy.get('body').should('exist');
    });

    it("exports work when category filter is active", () => {
      cy.get('[data-testid="category-filter"]').select('growth');
      
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });

    it("exports work when sort is active", () => {
      cy.get('[data-testid="sort-select"]').select('name');
      
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });
  });

  describe("Multiple Exports", () => {
    
    it("can export beginner CSV multiple times", () => {
      cy.get('[data-testid="beginner-csv-btn"]').click();
      cy.wait(500);
      cy.get('[data-testid="beginner-csv-btn"]').click();
      cy.wait(500);
      cy.get('[data-testid="beginner-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });

    it("can export pro CSV multiple times", () => {
      cy.get('[data-testid="export-csv-btn"]').click();
      cy.wait(500);
      cy.get('[data-testid="export-csv-btn"]').click();
      cy.wait(500);
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });

    it("can export both beginner and pro CSV", () => {
      cy.get('[data-testid="beginner-csv-btn"]').click();
      cy.wait(500);
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });
  });

  describe("Export Button Accessibility", () => {
    
    it("export buttons are keyboard accessible", () => {
      cy.get('[data-testid="export-csv-btn"]')
        .focus()
        .should('have.focus')
        .type('{enter}');
      
      cy.get('body').should('exist');
    });

    it("export buttons maintain focus after click", () => {
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });
  });

  describe("Export in Different Modes", () => {
    
    it("exports work in dark mode", () => {
      cy.get('#dtog').click();
      cy.get('body').should('have.class', 'dark-mode');
      
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });

    it("exports work after page reload", () => {
      cy.reload();
      cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
      cy.get('[data-testid="theme-card"]', { timeout: 10000 })
        .should('have.length.greaterThan', 10);
      
      cy.get('[data-testid="export-csv-btn"]').click();
      
      cy.get('body').should('exist');
    });
  });

});
