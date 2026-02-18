describe("Theme & Trend Explorer", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    
    // Wait for loading spinner to disappear (themes.json loading)
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    
    // Ensure themes have rendered
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  it("loads themes from JSON and renders cards", () => {
    cy.get('[data-testid="themes-grid"]').should("exist");
    
    // Should have 38 themes (11 original + 27 new packs)
    cy.get('[data-testid="theme-card"]')
      .should("have.length", 38);
  });

  it("search filters themes", () => {
    // Wait for search input to be interactable
    cy.get('[data-testid="theme-search"]', { timeout: 5000 })
      .should('be.visible')
      .clear()
      .type("income");
    
    // Should show income-related themes
    cy.get('[data-testid="theme-card"]')
      .its("length")
      .should("be.greaterThan", 0)
      .and("be.lessThan", 38); // Fewer than total
  });

  it("compare mode caps at 5", () => {
    // Activate compare mode
    cy.get('[data-testid="compare-toggle"]', { timeout: 5000 })
      .should('be.visible')
      .click();

    // Try to select 6 themes (only 5 should be selected)
    cy.get('[data-testid="theme-card"]').each(($card, index) => {
      if (index < 6) {
        cy.wrap($card).click({ force: true });
      }
    });

    // Verify count is capped at 5
    cy.get('[data-testid="compare-count"]').then(($el) => {
      const text = $el.text();
      const count = parseInt(text.match(/\d+/)[0], 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles detailed view", () => {
    // Click first theme card to open detail
    cy.get('[data-testid="theme-card"]', { timeout: 5000 })
      .first()
      .should('be.visible')
      .click();

    // Detail view should be visible
    cy.get('[data-testid="theme-detail"]', { timeout: 5000 })
      .should("be.visible");

    // View toggle container should exist
    cy.get('[data-testid="view-toggle"]', { timeout: 3000 })
      .should('exist');
    
    // Click the "Detailed View" button
    cy.get('[data-testid="view-toggle"]')
      .find('button[data-mode="detailed"]')
      .click();

    // Verify detailed content appears (uses class .detailed-only.show)
    cy.get('.detailed-only.show', { timeout: 3000 })
      .should('exist');
  });

  it("diagnostics panel opens", () => {
    // Scroll to bottom where diagnostics button is
    cy.get('[data-testid="diagnostics-toggle"]', { timeout: 5000 })
      .scrollIntoView()
      .should('be.visible')
      .click();
    
    cy.get('[data-testid="diagnostics-panel"]', { timeout: 3000 })
      .should("be.visible");
  });

});
