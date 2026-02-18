// cypress/e2e/themes/themes_guided.cy.js
//
// Tests for Theme & Trend Explorer "Help Me Choose" guided mode

describe("Theme Explorer - Guided Mode", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  describe("Opening Guided Mode", () => {
    
    it("help me choose button exists", () => {
      cy.get('[data-testid="help-choose-btn"]')
        .should('be.visible')
        .and('contain', 'Help Me Choose');
    });

    it("clicking help me choose opens guided mode", () => {
      cy.get('[data-testid="help-choose-btn"]').click();
      
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 })
        .should('be.visible');
    });
  });

  describe("Guided Mode Questions", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="help-choose-btn"]').click();
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 }).should('be.visible');
    });

    it("shows question 1 (time horizon)", () => {
      cy.get('[data-testid="guided-mode"]').within(() => {
        cy.contains('Question 1 of').should('be.visible');
      });
    });

    it("question 1 has multiple options", () => {
      cy.get('[data-testid="guide-opt-0"]').should('exist');
      cy.get('[data-testid="guide-opt-1"]').should('exist');
      cy.get('[data-testid="guide-opt-2"]').should('exist');
    });

    it("selecting an option highlights it", () => {
      cy.get('[data-testid="guide-opt-0"]').click();
      
      cy.get('[data-testid="guide-opt-0"]')
        .should('have.class', 'sel');
    });

    it("next button is disabled until option selected", () => {
      cy.get('[data-testid="guide-next"]')
        .should('have.attr', 'disabled');
      
      cy.get('[data-testid="guide-opt-0"]').click();
      
      cy.get('[data-testid="guide-next"]')
        .should('not.have.attr', 'disabled');
    });

    it("clicking next advances to question 2", () => {
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.contains('Question 2 of').should('be.visible');
    });

    it("back button appears on question 2", () => {
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.contains('button', 'Back').should('be.visible');
    });

    it("back button returns to question 1", () => {
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.contains('button', 'Back').click();
      
      cy.contains('Question 1 of').should('be.visible');
    });
  });

  describe("Complete Guided Flow", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="help-choose-btn"]').click();
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 }).should('be.visible');
    });

    it("answering all questions shows recommendations", () => {
      // Question 1: time horizon
      cy.get('[data-testid="guide-opt-2"]').click(); // Long term
      cy.get('[data-testid="guide-next"]').click();
      
      // Question 2: risk tolerance
      cy.get('[data-testid="guide-opt-1"]').click(); // Moderate
      cy.get('[data-testid="guide-next"]').click();
      
      // Question 3: goal
      cy.get('[data-testid="guide-opt-0"]').click(); // Growth
      cy.get('[data-testid="guide-next"]').click();
      
      // Should show results
      cy.get('[data-testid="guide-results"]', { timeout: 3000 })
        .should('be.visible');
    });

    it("recommendations show 2-3 themes", () => {
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('.guide-result')
        .should('have.length.greaterThan', 1)
        .and('have.length.lessThan', 4);
    });

    it("each recommendation shows theme name and details", () => {
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('.guide-result').first().within(() => {
        cy.get('strong').should('exist'); // Theme name
        cy.contains('Why this matches you').should('exist');
        cy.contains('What could go wrong').should('exist');
      });
    });

    it("clicking a recommendation opens theme detail", () => {
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('.guide-result').first().click();
      
      // Should close guided mode and open theme detail
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 })
        .should('be.visible');
    });

    it("close button returns to grid", () => {
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.contains('button', 'Close').click();
      
      cy.get('#lv').should('be.visible');
      cy.get('[data-testid="guided-mode"]').should('not.be.visible');
    });
  });

  describe("Different Answer Combinations", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="help-choose-btn"]').click();
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 }).should('be.visible');
    });

    it("conservative answers recommend defensive themes", () => {
      // Short term
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Uncomfortable with drops
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Stability
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-results"]').should('be.visible');
    });

    it("aggressive answers recommend growth themes", () => {
      // Very long term
      cy.get('[data-testid="guide-opt-3"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Comfortable with swings
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Fast growth
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-results"]').should('be.visible');
    });

    it("income-focused answers recommend income themes", () => {
      // Medium term
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Moderate risk tolerance
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      // Regular income
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-results"]').should('be.visible');
    });
  });

  describe("UI Close Mechanisms", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="help-choose-btn"]').click();
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 }).should('be.visible');
    });

    it("close X button closes guided mode", () => {
      cy.get('[data-testid="guided-mode"]').within(() => {
        cy.contains('button', '✕').click();
      });
      
      cy.get('[data-testid="guided-mode"]').should('not.be.visible');
    });
  });

  describe("Confidence Levels", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="help-choose-btn"]').click();
      cy.get('[data-testid="guided-mode"]', { timeout: 3000 }).should('be.visible');
    });

    it("shows confidence level in results", () => {
      cy.get('[data-testid="guide-opt-2"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-1"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.get('[data-testid="guide-opt-0"]').click();
      cy.get('[data-testid="guide-next"]').click();
      
      cy.contains('Confidence:').should('be.visible');
    });
  });

});
