describe("Theme & Trend Explorer", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  // ULTRA-ROBUST wait function
  function waitForPageFullyReady() {
    // 1. Wait for load bar to disappear
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    
    // 2. Wait for themes grid to exist
    cy.get('[data-testid="themes-grid"]', { timeout: 20000 }).should('exist');
    
    // 3. Wait for cards to render
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    
    // 4. Extra settling time for CI
    cy.wait(1000);
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageFullyReady();
  });

  it("loads themes from JSON and renders cards", () => {
    cy.get('[data-testid="themes-grid"]').should("exist");
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });

  it("search filters themes", () => {
    // Extra wait and visibility check
    cy.get('[data-testid="theme-search"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled');
    
    cy.wait(500);
    
    cy.get('[data-testid="theme-search"]')
      .clear()
      .type("income", { delay: 100 });
    
    cy.wait(800); // Wait for filtering
    
    cy.get('[data-testid="theme-card"]')
      .its("length")
      .should("be.greaterThan", 0)
      .and("be.lessThan", 38);
  });

  it("compare mode caps at 5", () => {
    // Ensure button is ready
    cy.get('[data-testid="compare-toggle"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled');
    
    cy.wait(500);
    
    cy.get('[data-testid="compare-toggle"]').click();
    
    cy.wait(800); // Wait for mode to activate
    
    // Verify compare bar appeared
    cy.get('#cmp-bar', { timeout: 5000 }).should('be.visible');

    // Try to select 6 themes
    cy.get('[data-testid="theme-card"]').each(($card, index) => {
      if (index < 6) {
        cy.wrap($card).click({ force: true });
        cy.wait(200); // Small delay between clicks
      }
    });

    // Verify cap
    cy.get('[data-testid="compare-count"]').then(($el) => {
      const text = $el.text();
      const count = parseInt(text.match(/\d+/)[0], 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles detailed view", () => {
    // Ensure cards are clickable
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .first()
      .should('be.visible');
    
    cy.wait(500);
    
    cy.get('[data-testid="theme-card"]').first().click({ force: true });

    cy.wait(1500); // Wait for navigation

    // Detail view should be visible
    cy.get('[data-testid="theme-detail"]', { timeout: 10000 })
      .should("be.visible");

    // Wait for view toggle to be ready
    cy.get('[data-testid="view-toggle"]', { timeout: 5000 })
      .should('exist')
      .and('be.visible');
    
    cy.wait(500);
    
    // Click detailed view button
    cy.get('[data-testid="view-toggle"]')
      .find('button[data-mode="detailed"]')
      .should('be.visible')
      .click({ force: true });

    cy.wait(800); // Wait for transition

    // Verify detailed content
    cy.get('.detailed-only.show', { timeout: 5000 }).should('exist');
  });

  it("diagnostics panel opens", () => {
    // Scroll into view first
    cy.get('[data-testid="diagnostics-toggle"]', { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible');
    
    cy.wait(500);
    
    cy.get('[data-testid="diagnostics-toggle"]').click({ force: true });
    
    cy.wait(800);
    
    cy.get('[data-testid="diagnostics-panel"]', { timeout: 5000 })
      .should("be.visible");
  });

});
