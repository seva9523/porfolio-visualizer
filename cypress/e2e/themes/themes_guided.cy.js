// cypress/e2e/themes/themes_guided.cy.js
// ULTRA-ROBUST version - simplified for CI reliability

describe("Theme Explorer - Guided Mode", () => {

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

  it("help me choose button exists", () => {
    cy.get('[data-testid="help-choose-btn"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Help Me Choose');
  });

  it("clicking help me choose opens guided mode", () => {
    cy.get('[data-testid="help-choose-btn"]')
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    
    cy.get('[data-testid="guided-mode"]', { timeout: 5000 })
      .should('be.visible');
  });

  it("shows question 1 (time horizon)", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guided-mode"]').within(() => {
      cy.contains('Question 1 of').should('be.visible');
    });
  });

  it("question 1 has multiple options", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-0"]', { timeout: 5000 }).should('exist');
    cy.get('[data-testid="guide-opt-1"]').should('exist');
    cy.get('[data-testid="guide-opt-2"]').should('exist');
  });

  it("selecting an option highlights it", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-0"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    cy.wait(500);
    
    cy.get('[data-testid="guide-opt-0"]')
      .should('have.class', 'sel');
  });

  it("clicking next advances to question 2", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-0"]').click();
    cy.wait(500);
    
    cy.get('[data-testid="guide-next"]', { timeout: 5000 })
      .should('be.visible')
      .and('not.have.attr', 'disabled')
      .click();
    
    cy.wait(1000);
    
    cy.contains('Question 2 of').should('be.visible');
  });

  it("answering all questions shows recommendations", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    // Question 1
    cy.get('[data-testid="guide-opt-2"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1000);
    
    // Question 2
    cy.get('[data-testid="guide-opt-1"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1000);
    
    // Question 3
    cy.get('[data-testid="guide-opt-0"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1500);
    
    // Results
    cy.get('[data-testid="guide-results"]', { timeout: 5000 })
      .should('be.visible');
  });

  it("close button returns to grid", () => {
    cy.get('[data-testid="help-choose-btn"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-2"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-1"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="guide-opt-0"]').click();
    cy.wait(500);
    cy.get('[data-testid="guide-next"]').click();
    cy.wait(1500);
    
    cy.contains('button', 'Close', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    cy.get('#lv').should('be.visible');
  });

});
