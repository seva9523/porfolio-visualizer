// cypress/e2e/themes/themes_compare.cy.js
// ULTRA-ROBUST version - simplified for CI reliability

describe("Theme Explorer - Compare Mode", () => {

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

  it("compare mode button exists and is clickable", () => {
    cy.get('[data-testid="compare-toggle"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Compare');
  });

  it("activating compare mode shows compare bar", () => {
    cy.get('[data-testid="compare-toggle"]')
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    
    cy.get('#cmp-bar', { timeout: 5000 }).should('be.visible');
  });

  it("selecting themes updates counter", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-count"]')
      .should('contain', '2 selected');
  });

  it("cannot select more than 5 themes (cap enforced)", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    // Try to select 7 themes
    for (let i = 0; i < 7; i++) {
      cy.get('[data-testid="theme-card"]').eq(i).click({ force: true });
      cy.wait(200);
    }
    
    cy.get('[data-testid="compare-count"]').then(($el) => {
      const text = $el.text();
      const count = parseInt(text.match(/\d+/)[0], 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("deselecting a theme reduces counter", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-count"]').should('contain', '2 selected');
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-count"]').should('contain', '1 selected');
  });

  it("compare go button appears when 2+ themes selected", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-go-btn"]', { timeout: 5000 })
      .should('be.visible');
  });

  it("clicking compare go opens compare view", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-go-btn"]').click();
    cy.wait(1500);
    
    cy.get('#cv').should('have.class', 'on');
  });

  it("back button returns to grid", () => {
    cy.get('[data-testid="compare-toggle"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').eq(0).click({ force: true });
    cy.wait(300);
    cy.get('[data-testid="theme-card"]').eq(1).click({ force: true });
    cy.wait(300);
    
    cy.get('[data-testid="compare-go-btn"]').click();
    cy.wait(1500);
    
    cy.get('[data-testid="compare-back-btn"]', { timeout: 5000 })
      .should('be.visible')
      .click();
    
    cy.wait(1000);
    cy.get('#lv').should('be.visible');
  });

});
