// cypress/e2e/themes/themes_compare.cy.js
//
// Tests for Theme & Trend Explorer compare mode and compare view

describe("Theme Explorer - Compare Mode & View", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  describe("Compare Mode Activation", () => {
    
    it("compare mode button exists and is clickable", () => {
      cy.get('[data-testid="compare-toggle"]')
        .should('be.visible')
        .and('contain', 'Compare');
    });

    it("activating compare mode shows compare bar", () => {
      cy.get('[data-testid="compare-toggle"]').click();
      
      // Compare bar should appear
      cy.get('#cmp-bar').should('be.visible');
      cy.contains('Compare Mode:').should('be.visible');
    });

    it("activating compare mode adds checkboxes to cards", () => {
      cy.get('[data-testid="theme-card"]').first().within(() => {
        // No checkbox initially
        cy.get('input[type="checkbox"]').should('not.exist');
      });

      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').first().within(() => {
        // Checkbox should now exist
        cy.get('input[type="checkbox"]').should('exist');
      });
    });

    it("deactivating compare mode hides checkboxes", () => {
      cy.get('[data-testid="compare-toggle"]').click();
      cy.get('[data-testid="theme-card"]').first().within(() => {
        cy.get('input[type="checkbox"]').should('exist');
      });
      
      // Toggle off
      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').first().within(() => {
        cy.get('input[type="checkbox"]').should('not.exist');
      });
    });
  });

  describe("Selecting Themes", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="compare-toggle"]').click();
    });

    it("selecting one theme updates counter", () => {
      cy.get('[data-testid="theme-card"]').first().click();
      
      cy.get('[data-testid="compare-count"]')
        .should('contain', '1 selected');
    });

    it("selecting two themes updates counter", () => {
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      
      cy.get('[data-testid="compare-count"]')
        .should('contain', '2 selected');
    });

    it("selecting three themes updates counter", () => {
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="theme-card"]').eq(2).click();
      
      cy.get('[data-testid="compare-count"]')
        .should('contain', '3 selected');
    });

    it("selecting five themes updates counter", () => {
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="theme-card"]').eq(i).click();
      }
      
      cy.get('[data-testid="compare-count"]')
        .should('contain', '5 selected');
    });

    it("cannot select more than 5 themes (cap enforced)", () => {
      // Try to select 7 themes
      for (let i = 0; i < 7; i++) {
        cy.get('[data-testid="theme-card"]').eq(i).click({ force: true });
      }
      
      // Counter should cap at 5
      cy.get('[data-testid="compare-count"]').then(($el) => {
        const text = $el.text();
        const count = parseInt(text.match(/\d+/)[0], 10);
        expect(count).to.equal(5);
      });
    });

    it("deselecting a theme reduces counter", () => {
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="compare-count"]').should('contain', '2 selected');
      
      // Deselect first theme
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="compare-count"]').should('contain', '1 selected');
    });

    it("selected cards have visual indicator", () => {
      cy.get('[data-testid="theme-card"]').first().click();
      
      // Card should have cmp-sel class
      cy.get('[data-testid="theme-card"]').first()
        .should('have.class', 'cmp-sel');
    });
  });

  describe("Compare Go Button", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="compare-toggle"]').click();
    });

    it("compare go button appears when 2+ themes selected", () => {
      cy.get('[data-testid="compare-go-btn"]').should('exist');
      
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      
      cy.get('[data-testid="compare-go-btn"]')
        .should('be.visible')
        .and('contain', 'See Comparison');
    });

    it("clicking compare go opens compare view", () => {
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      
      cy.get('[data-testid="compare-go-btn"]').click();
      
      // Compare view should be visible
      cy.get('#cv').should('have.class', 'on');
      
      // List view should be hidden
      cy.get('#lv').should('not.be.visible');
    });
  });

  describe("Compare View Content", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="compare-toggle"]').click();
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="compare-go-btn"]').click();
    });

    it("shows back button", () => {
      cy.get('[data-testid="compare-back-btn"]')
        .should('be.visible')
        .and('contain', 'Back to Themes');
    });

    it("back button returns to grid", () => {
      cy.get('[data-testid="compare-back-btn"]').click();
      
      cy.get('#lv').should('be.visible');
      cy.get('#cv').should('not.have.class', 'on');
    });

    it("displays comparison table or content", () => {
      // Compare view should have some content
      cy.get('#cc').should('not.be.empty');
    });

    it("shows overlap detection when applicable", () => {
      // Look for overlap indicators (if present)
      cy.get('#cc').then(($content) => {
        // Should have some comparison metrics
        expect($content.text().length).to.be.greaterThan(10);
      });
    });
  });

  describe("Compare with 3 Themes", () => {
    
    it("can compare 3 themes simultaneously", () => {
      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="theme-card"]').eq(2).click();
      
      cy.get('[data-testid="compare-count"]').should('contain', '3 selected');
      
      cy.get('[data-testid="compare-go-btn"]').click();
      
      cy.get('#cv').should('have.class', 'on');
    });
  });

  describe("Compare with Maximum (5) Themes", () => {
    
    it("can compare 5 themes simultaneously", () => {
      cy.get('[data-testid="compare-toggle"]').click();
      
      for (let i = 0; i < 5; i++) {
        cy.get('[data-testid="theme-card"]').eq(i).click();
      }
      
      cy.get('[data-testid="compare-count"]').should('contain', '5 selected');
      
      cy.get('[data-testid="compare-go-btn"]').click();
      
      cy.get('#cv').should('have.class', 'on');
    });
  });

  describe("Edge Cases", () => {
    
    it("exiting compare mode clears selections", () => {
      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="compare-count"]').should('contain', '2 selected');
      
      // Exit compare mode
      cy.get('[data-testid="compare-toggle"]').click();
      
      // Re-enter compare mode
      cy.get('[data-testid="compare-toggle"]').click();
      
      // Counter should reset to 0
      cy.get('[data-testid="compare-count"]').should('contain', '0 selected');
    });

    it("works correctly with filtered themes", () => {
      cy.get('[data-testid="theme-search"]').type("stock");
      
      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      
      cy.get('[data-testid="compare-count"]').should('contain', '2 selected');
    });

    it("works correctly with sorted themes", () => {
      cy.get('[data-testid="sort-select"]').select('name');
      
      cy.get('[data-testid="compare-toggle"]').click();
      
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-card"]').eq(1).click();
      
      cy.get('[data-testid="compare-count"]').should('contain', '2 selected');
    });
  });

});
