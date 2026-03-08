// cypress/e2e/themes/themes_detail.cy.js
describe("Theme Explorer — Detail View", () => {
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

  it("TH-030: clicking a theme card shows full detail view with all sections", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="theme-detail"]').should("be.visible");
    cy.get("#dc").should("exist").invoke("text").should("have.length.greaterThan", 50);
    cy.get("#dc").within(() => {
      cy.get("h2").should("exist");
      cy.get('[data-testid="theme-stats"]').should("exist");
      cy.get('[data-testid="suitability-section"]').should("exist");
      cy.get('[data-testid="stress-section"]').should("exist");
      cy.get('[data-testid="risk-section"]').should("exist");
      cy.get('[data-testid="methodology-section"]').should("exist");
    });
  });

  it("TH-031: back button returns to theme list", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(1500);
    cy.get('[data-testid="back-btn"]').click({ force: true });
    cy.wait(500);
    cy.get("#lv").should("be.visible");
    cy.get('[data-testid="theme-detail"]').should("not.have.class", "on");
  });

  it("TH-032/033: view toggle switches between simple and detailed", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="view-simple"]').should("have.class", "vt-on");
    cy.get('[data-testid="view-detailed"]').click({ force: true });
    cy.wait(500);
    cy.get('[data-testid="view-detailed"]').should("have.class", "vt-on");
    cy.get('[data-testid="trending-section"]').should("be.visible");
  });

  it("TH-034: performance chart area exists in detail view", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get("#dc").should("exist").invoke("text").should("have.length.greaterThan", 50);
    cy.get("#dc .chart-wrap").should("exist");
  });

  it("TH-035: stress table has all three crisis periods", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="stress-section"]').within(() => {
      cy.contains("COVID Crash").should("exist");
      cy.contains("2022 Rate Shock").should("exist");
      cy.contains("Tech Rout").should("exist");
    });
  });

  it("TH-037: methodology shows data coverage checklist", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get('[data-testid="data-checklist"]').should("exist");
  });

  it("TH-038: download data button exists", () => {
    cy.get('[data-testid="theme-card"]').first().click({ force: true });
    cy.wait(2000);
    cy.get("#dc").contains("Download Data").should("exist");
  });

  ["gold", "ai", "small_caps", "dividend_income"].forEach((id) => {
    it(`TH-030: detail view renders for "${id}"`, () => {
      cy.get(`[data-theme-id="${id}"]`).scrollIntoView().click({ force: true });
      cy.wait(2000);
      cy.get('[data-testid="theme-detail"]').should("be.visible");
      cy.get("#dc").invoke("text").should("have.length.greaterThan", 50);
      cy.get('[data-testid="back-btn"]').click({ force: true });
    });
  });

  it("TH-040: rapid navigation through 3 themes does not crash", () => {
    ["ai", "bitcoin", "gold"].forEach((id) => {
      cy.get(`[data-theme-id="${id}"]`).scrollIntoView().click({ force: true });
      cy.wait(1500);
      cy.get("#dc").invoke("text").should("have.length.greaterThan", 20);
      cy.get('[data-testid="back-btn"]').click({ force: true });
      cy.wait(500);
    });
  });
});
