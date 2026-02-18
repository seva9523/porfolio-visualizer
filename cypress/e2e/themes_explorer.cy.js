describe("Theme & Trend Explorer", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    
    // Wait for loading spinner to disappear
    cy.get('#load-bar', { timeout: 20000 }).should('not.be.visible');
    
    // Ensure themes have rendered
    cy.get('.tcard', { timeout: 15000 }).should('have.length.greaterThan', 10);
    
    // Small buffer for page to settle
    cy.wait(500);
  });

  it("loads themes from JSON and renders cards", () => {
    cy.get('#tgrid').should("exist");
    cy.get('.tcard').should("have.length", 38);
  });

  it("search filters themes", () => {
    cy.get('#search-in')
      .should('be.visible')
      .clear()
      .type("income");
    
    cy.wait(500);
    
    cy.get('.tcard').its("length").should("be.greaterThan", 0).and("be.lessThan", 38);
  });

  it("compare mode caps at 5", () => {
    cy.get('#cmp-btn').should('be.visible').click();
    
    cy.wait(500);
    cy.get('#cmp-bar').should('be.visible');

    // Click up to 6 cards
    cy.get('.tcard').each(($card, index) => {
      if (index < 6) {
        cy.wrap($card).click({ force: true });
      }
    });

    cy.get('#cmp-count').then(($el) => {
      const text = $el.text();
      const count = parseInt(text.match(/\d+/)[0], 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles detailed view", () => {
    cy.get('.tcard').first().click({ force: true });
    
    cy.wait(1000);
    
    cy.get('#dv').should('have.class', 'on');
    
    // Look for view toggle
    cy.get('.vtoggle').should('exist');
    cy.get('.vtoggle button[data-mode="detailed"]').click({ force: true });
    
    cy.wait(500);
    
    cy.get('.detailed-only.show').should('exist');
  });

  it("diagnostics panel opens", () => {
    cy.get('#diag-toggle').scrollIntoView().should('be.visible').click({ force: true });
    
    cy.wait(500);
    
    cy.get('#diag-panel').should('be.visible');
  });

});
