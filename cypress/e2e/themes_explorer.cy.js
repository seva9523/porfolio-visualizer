describe("Theme & Trend Explorer", () => {

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    
    // Dismiss onboarding modal if it appears
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="onboarding-modal"]').length > 0) {
        cy.get('[data-testid="onboarding-modal"]').then(($modal) => {
          if ($modal.is(':visible')) {
            cy.get('[data-testid="onboarding-modal"]').find('button').first().click({ force: true });
          }
        });
      }
    });
    
    cy.wait(2000);
  }

  beforeEach(() => {
    cy.visit("/themes.html");
    waitForPageReady();
  });

  it("loads themes from JSON and renders cards", () => {
    // The grid container uses id="grid" not data-testid="themes-grid"
    cy.get("#grid").should("exist");
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });

  it("search filters themes", () => {
    cy.get('[data-testid="theme-search"]', { timeout: 10000 }).should('exist');
    cy.wait(1000);
    
    cy.get('[data-testid="theme-search"]')
      .clear({ force: true })
      .type("income", { force: true, delay: 100 });
    
    cy.wait(1500);
    
    cy.get('[data-testid="theme-card"]')
      .its("length")
      .should("be.greaterThan", 0)
      .and("be.lessThan", 38);
  });

  it("compare mode caps at 5", () => {
    cy.get('[data-testid="compare-toggle"]', { timeout: 10000 }).should('exist');
    cy.wait(1000);
    
    cy.get('[data-testid="compare-toggle"]').click({ force: true });
    cy.wait(1500);
    
    cy.get('#cmp-bar', { timeout: 5000 }).should('exist');

    // Check checkboxes on the first 6 cards
    for (let i = 0; i < 6; i++) {
      cy.get('[data-testid^="compare-checkbox-"]').eq(i).check({ force: true });
      cy.wait(300);
    }

    // The compare-count element uses data-testid="compare-count" and id="cmp-count"
    cy.get('[data-testid="compare-count"]').then(($el) => {
      const text = $el.text();
      const count = parseInt(text.match(/\d+/)[0], 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles detailed view", () => {
    cy.get('[data-testid="theme-card"]', { timeout: 10000 }).first().should('exist');
    cy.wait(1000);
    
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2500);

    cy.get('[data-testid="theme-detail"]', { timeout: 10000 }).should("exist");
    cy.get('[data-testid="view-toggle"]', { timeout: 5000 }).should('exist');
    cy.wait(1000);
    
    // The detailed button uses data-testid="view-detailed"
    cy.get('[data-testid="view-detailed"]').click({ force: true });

    cy.wait(1500);
    cy.get('.detailed-only.show', { timeout: 5000 }).should('exist');
  });

  it("diagnostics panel opens", () => {
    cy.get('[data-testid="diagnostics-toggle"]', { timeout: 10000 }).should('exist');
    cy.wait(1000);
    
    cy.get('[data-testid="diagnostics-toggle"]').click({ force: true });
    cy.wait(1500);
    
    // The diagnostics panel uses id="diag-panel" not data-testid="diagnostics-panel"
    cy.get('#diag-panel', { timeout: 5000 }).should("be.visible");
  });

});
