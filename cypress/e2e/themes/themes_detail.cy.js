// cypress/e2e/themes/themes_detail.cy.js
//
// Tests for Theme & Trend Explorer detail view

describe("Theme Explorer - Detail View", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  describe("Opening Detail View", () => {
    
    it("clicking a theme card opens detail view", () => {
      cy.get('[data-testid="theme-card"]').first().click();
      
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 })
        .should('be.visible');
      
      // List view should be hidden
      cy.get('#lv').should('not.be.visible');
    });

    it("detail view shows back button", () => {
      cy.get('[data-testid="theme-card"]').first().click();
      
      cy.get('[data-testid="back-btn"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain', 'Back to Themes');
    });

    it("back button returns to grid", () => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
      
      cy.get('[data-testid="back-btn"]').click();
      
      cy.get('#lv').should('be.visible');
      cy.get('[data-testid="theme-detail"]').should('not.be.visible');
    });
  });

  describe("Detail View Content - Header", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("shows theme name", () => {
      cy.get('[data-testid="theme-detail"]').within(() => {
        cy.get('h2').should('exist').and('not.be.empty');
      });
    });

    it("shows category tag", () => {
      cy.get('[data-testid="theme-detail"]').within(() => {
        cy.get('.ctag').should('exist');
      });
    });

    it("shows risk pill", () => {
      cy.get('[data-testid="theme-detail"]').within(() => {
        cy.get('.rpill').should('exist');
      });
    });

    it("shows core vs satellite pill", () => {
      cy.get('[data-testid="theme-detail"]').within(() => {
        cy.get('.cs-pill').should('exist');
      });
    });

    it("shows megaTheme and tags", () => {
      cy.get('[data-testid="theme-detail"]').within(() => {
        cy.get('.mtag').should('have.length.greaterThan', 0);
      });
    });
  });

  describe("Confidence Card", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("confidence card displays", () => {
      cy.get('[data-testid="confidence-card"]', { timeout: 3000 })
        .should('exist');
    });

    it("confidence card has summary sentence", () => {
      cy.get('[data-testid="confidence-card"]').within(() => {
        cy.get('.conf-sentence').should('exist').and('not.be.empty');
      });
    });

    it("confidence card shows traffic lights", () => {
      cy.get('[data-testid="confidence-card"]').within(() => {
        cy.get('.traffic-item').should('have.length', 3);
      });
    });
  });

  describe("Suitability Section", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("suitability section displays", () => {
      cy.get('[data-testid="suitability-section"]', { timeout: 3000 })
        .should('exist');
    });

    it("shows who its for", () => {
      cy.get('[data-testid="suitability-section"]').within(() => {
        cy.contains('may suit you if').should('exist');
        cy.get('.suit-yes ul li').should('have.length.greaterThan', 0);
      });
    });

    it("shows who its not for", () => {
      cy.get('[data-testid="suitability-section"]').within(() => {
        cy.contains('may NOT suit you if').should('exist');
        cy.get('.suit-no ul li').should('have.length.greaterThan', 0);
      });
    });
  });

  describe("Performance Metrics", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("performance metrics section displays", () => {
      cy.get('[data-testid="theme-stats"]', { timeout: 3000 })
        .should('exist');
    });

    it("shows multiple performance metrics", () => {
      cy.get('[data-testid="theme-stats"]').within(() => {
        cy.get('.sc').should('have.length.greaterThan', 3);
      });
    });

    it("metrics include 1Y, 3Y, 5Y growth", () => {
      cy.get('[data-testid="theme-stats"]').within(() => {
        cy.contains('1-Year Growth').should('exist');
        cy.contains('3-Year Growth').should('exist');
        cy.contains('5-Year Growth').should('exist');
      });
    });
  });

  describe("Trending Section", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("trending section displays in detailed view", () => {
      // Toggle to detailed view first
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
      
      cy.get('[data-testid="trending-section"]', { timeout: 3000 })
        .should('be.visible');
    });

    it("signal breakdown table displays", () => {
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
      
      // Open the details disclosure
      cy.get('[data-testid="trending-section"]').within(() => {
        cy.get('details').click();
      });
      
      cy.get('[data-testid="signal-table"]', { timeout: 3000 })
        .should('be.visible');
    });

    it("anti-chasing warning shows for crowded themes", () => {
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
      
      // Some themes might show the warning
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="anti-chase-warn"]').length > 0) {
          cy.get('[data-testid="anti-chase-warn"]').should('be.visible');
        }
      });
    });
  });

  describe("View Toggle (Simple vs Detailed)", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("view toggle exists", () => {
      cy.get('[data-testid="view-toggle"]', { timeout: 3000 })
        .should('exist');
    });

    it("simple view is active by default", () => {
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="simple"]')
        .should('have.class', 'vt-on');
    });

    it("clicking detailed view shows additional content", () => {
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
      
      cy.get('.detailed-only.show', { timeout: 3000 })
        .should('exist');
    });

    it("switching back to simple hides detailed content", () => {
      // Switch to detailed
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
      
      cy.get('.detailed-only.show').should('exist');
      
      // Switch back to simple
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="simple"]')
        .click();
      
      cy.get('.detailed-only.show').should('not.exist');
    });
  });

  describe("Guardrails and Safety Messages", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("guardrails section appears when applicable", () => {
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="guardrails"]').length > 0) {
          cy.get('[data-testid="guardrails"]').should('be.visible');
        }
      });
    });
  });

  describe("Export Functionality", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("download data button exists", () => {
      cy.contains('button', 'Download Data').should('exist');
    });

    it("download data button is clickable", () => {
      cy.contains('button', 'Download Data').click();
      
      // Should trigger download (we can't verify the actual file, but it shouldn't crash)
    });
  });

  describe("Multiple Themes Navigation", () => {
    
    it("can view different themes sequentially", () => {
      // View first theme
      cy.get('[data-testid="theme-card"]').eq(0).click();
      cy.get('[data-testid="theme-detail"]').should('be.visible');
      
      // Go back
      cy.get('[data-testid="back-btn"]').click();
      
      // View second theme
      cy.get('[data-testid="theme-card"]').eq(1).click();
      cy.get('[data-testid="theme-detail"]').should('be.visible');
      
      // Go back again
      cy.get('[data-testid="back-btn"]').click();
      cy.get('#lv').should('be.visible');
    });

    it("viewing detail does not lose filter state", () => {
      // Apply a filter
      cy.get('[data-testid="theme-search"]').type("income");
      
      const initialCount = cy.get('[data-testid="theme-card"]').its('length');
      
      // View a theme
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]').should('be.visible');
      
      // Go back
      cy.get('[data-testid="back-btn"]').click();
      
      // Filter should still be active
      cy.get('[data-testid="theme-search"]').should('have.value', 'income');
    });
  });

  describe("Charts in Detail View", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
    });

    it("does not crash when rendering charts", () => {
      // Page should be stable
      cy.get('[data-testid="theme-detail"]').should('be.visible');
      
      // Wait a moment for any charts to render
      cy.wait(1000);
      
      // No errors should occur
      cy.get('[data-testid="theme-detail"]').should('be.visible');
    });
  });

  describe("Stress Test Section", () => {
    
    beforeEach(() => {
      cy.get('[data-testid="theme-card"]').first().click();
      cy.get('[data-testid="theme-detail"]', { timeout: 5000 }).should('be.visible');
      
      // Switch to detailed view to see stress tests
      cy.get('[data-testid="view-toggle"]')
        .find('button[data-mode="detailed"]')
        .click();
    });

    it("stress test table displays", () => {
      // Look for stress test content
      cy.get('.stress-tbl, table').should('exist');
    });
  });

});
