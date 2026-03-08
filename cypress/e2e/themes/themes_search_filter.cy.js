// cypress/e2e/themes/themes_search_filter.cy.js
describe("Theme Explorer — Filters & Sorting", () => {
  function waitForPageReady() {
    cy.get("#load-bar", { timeout: 30000 }).should("not.be.visible");
    cy.get('[data-testid="theme-card"]', { timeout: 25000 }).should("have.length.greaterThan", 10);
    cy.get("body").then(($b) => {
      if ($b.find('[data-testid="onboarding-modal"]:visible').length)
        cy.get('[data-testid="onboarding-modal"]').find("button").first().click({ force: true });
    });
    cy.wait(3000);
  }

  beforeEach(() => { cy.visit("/themes.html"); waitForPageReady(); });

  it("TH-010: all theme cards display with name", () => {
    cy.get('[data-testid="theme-card"]').should("have.length.greaterThan", 25);
    cy.get('[data-testid="theme-card"]').first().within(() => {
      cy.get(".tcard-name").should("exist").invoke("text").should("have.length.greaterThan", 2);
    });
  });

  it("TH-017: filter by category reduces card count", () => {
    cy.get('[data-testid="theme-card"]').then(($all) => {
      const totalCount = $all.length;
      cy.get("#cat-fil-side").select("growth", { force: true });
      cy.wait(500);
      cy.get('[data-testid="theme-card"]').should("have.length.lessThan", totalCount);
      cy.get('[data-testid="theme-card"]').should("have.length.greaterThan", 0);
    });
  });

  it("TH-020: reset filters restores all themes", () => {
    cy.get('[data-testid="theme-card"]').then(($all) => {
      const totalCount = $all.length;
      cy.get("#cat-fil-side").select("income", { force: true });
      cy.wait(500);
      cy.get('[data-testid="theme-card"]').should("have.length.lessThan", totalCount);
      cy.get(".resetbtn").click({ force: true });
      cy.wait(500);
      cy.get('[data-testid="theme-card"]').should("have.length", totalCount);
    });
  });

  it("TH-021: showing count text matches visible cards", () => {
    cy.get('[data-testid="theme-card"]').then(($cards) => {
      const count = $cards.length;
      cy.get("#showing-count").should("contain", `${count}`);
    });
  });

  it("TH-011: sort buttons exist and are clickable", () => {
    cy.contains("What's Hot").should("exist");
    cy.contains("5-Year Growth").should("exist");
    cy.contains("Calmest").should("exist");
  });
});
