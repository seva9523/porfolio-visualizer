describe("Theme & Trend Explorer", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

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
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("loads themes from JSON and renders cards", () => {
    cy.get('[data-testid="themes-grid"]').should("exist");
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

    // Click 6 cards individually (not using .each to avoid DOM detachment)
    for (let i = 0; i < 6; i++) {
      cy.get('[data-testid="theme-card"]').eq(i).click({ force: true });
      cy.wait(300);
    }

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
    
    cy.get('[data-testid="view-toggle"]')
      .find('button[data-mode="detailed"]')
      .click({ force: true });

    cy.wait(1500);
    cy.get('.detailed-only.show', { timeout: 5000 }).should('exist');
  });

  it("diagnostics panel opens", () => {
    cy.get('[data-testid="diagnostics-toggle"]', { timeout: 10000 }).should('exist');
    cy.wait(1000);
    
    cy.get('[data-testid="diagnostics-toggle"]').click({ force: true });
    cy.wait(1500);
    
    cy.get('[data-testid="diagnostics-panel"]', { timeout: 5000 }).should("exist");
  });

});
