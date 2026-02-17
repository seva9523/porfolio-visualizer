describe("Theme & Trend Explorer", () => {

  beforeEach(() => {
    cy.visit("/themes.html");
  });

  it("loads themes from JSON and renders cards", () => {
    cy.get('[data-testid="themes-grid"]').should("exist");
    cy.get('[data-testid="theme-card"]')
      .should("have.length.greaterThan", 10);
  });

  it("search filters themes", () => {
    cy.get('[data-testid="theme-search"]').type("income");
    cy.get('[data-testid="theme-card"]')
      .its("length")
      .should("be.greaterThan", 0);
  });

  it("compare mode caps at 5", () => {
    cy.get('[data-testid="compare-toggle"]').click();

    cy.get('[data-testid="theme-card"]').each(($card, index) => {
      if (index < 6) {
        cy.wrap($card).click({ force: true });
      }
    });

    cy.get('[data-testid="compare-count"]').then(($el) => {
      const count = parseInt($el.text(), 10);
      expect(count).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles detailed view", () => {
    cy.get('[data-testid="theme-card"]').first().click();

    cy.get('[data-testid="theme-detail"]').should("exist");

    cy.get('[data-testid="view-toggle"]').click();

    cy.get('[data-testid="detailed-view"]').should("exist");
  });

  it("diagnostics panel opens", () => {
    cy.get('[data-testid="diagnostics-toggle"]').click();
    cy.get('[data-testid="diagnostics-panel"]').should("be.visible");
  });

});
