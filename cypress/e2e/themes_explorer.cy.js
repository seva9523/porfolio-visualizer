describe("Theme & Trend Explorer", () => {
  it("loads themes from JSON and renders theme cards", () => {
    cy.visit("/themes.html");
    cy.contains("Loading themes").should("not.exist"); // or your loading text
    cy.get('[data-testid="theme-card"]').should("have.length.greaterThan", 10);
  });

  it("filters by search", () => {
    cy.visit("/themes.html");
    cy.get('[data-testid="theme-search"]').type("income");
    cy.get('[data-testid="theme-card"]').should("have.length.greaterThan", 0);
  });

  it("compare mode caps at 5 selections", () => {
    cy.visit("/themes.html");
    cy.get('[data-testid="compare-toggle"]').click();

    cy.get('[data-testid="theme-card-select"]').then(($btns) => {
      // click first 6 buttons; the UI should prevent the 6th
      for (let i = 0; i < Math.min(6, $btns.length); i++) {
        cy.wrap($btns[i]).click({ force: true });
      }
    });

    cy.get('[data-testid="compare-count"]').should(($el) => {
      const n = parseInt($el.text(), 10);
      expect(n).to.be.at.most(5);
    });
  });

  it("opens theme detail and toggles simple/detailed view", () => {
    cy.visit("/themes.html");
    cy.get('[data-testid="theme-card"]').first().click();
    cy.get('[data-testid="theme-detail"]').should("exist");

    cy.get('[data-testid="view-toggle"]').click();
    cy.get('[data-testid="detailed-view"]').should("exist");
  });
});
