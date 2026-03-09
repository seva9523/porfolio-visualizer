// cypress/e2e/dark_mode.cy.js
//
// Tests for dark mode: toggle, body class, icon/text swap, localStorage persistence.


describe("Dark Mode — toggle + persistence", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.clearLocalStorage();
    cy.reload();
  });

  it("starts in light mode by default", () => {
    cy.get("body").should("not.have.class", "dark-mode");
    cy.get("#mode-icon").should("contain.text", "🌙");
    cy.get("#mode-text").should("contain.text", "Dark Mode");
  });

  it("toggles to dark mode on button click", () => {
    // Click dark mode toggle
    cy.get(".dark-mode-toggle").click();

    cy.get("body").should("have.class", "dark-mode");
    cy.get("#mode-icon").should("contain.text", "☀️");
    cy.get("#mode-text").should("contain.text", "Light Mode");
  });

  it("toggles back to light mode on second click", () => {
    // Toggle on
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("have.class", "dark-mode");

    // Toggle off
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("not.have.class", "dark-mode");
    cy.get("#mode-icon").should("contain.text", "🌙");
  });

  it("persists dark mode preference after reload", () => {
    // Enable dark mode
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("have.class", "dark-mode");

    // Reload
    cy.reload();

    // Should still be dark
    cy.get("body").should("have.class", "dark-mode");
    cy.get("#mode-icon").should("contain.text", "☀️");
    cy.get("#mode-text").should("contain.text", "Light Mode");
  });

  it("persists light mode preference after reload", () => {
    // Enable dark, then disable
    cy.get(".dark-mode-toggle").click();
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("not.have.class", "dark-mode");

    // Reload
    cy.reload();

    // Should still be light
    cy.get("body").should("not.have.class", "dark-mode");
  });

  it("dark mode does not crash with charts rendered", () => {
    // Stub APIs
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    // Add holding and visualize
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("5");
    cy.contains("button", /visualize portfolio/i).click();

    // Wait for charts
    cy.get("#summary-section", { timeout: 10000 }).should("not.be.empty");
    cy.get("canvas#pieChart").should("exist");

    // Toggle dark mode — should not crash
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("have.class", "dark-mode");

    // Charts should still exist
    cy.get("canvas#pieChart").should("exist");
    cy.get("canvas#performanceChart").should("exist");

    // Toggle back
    cy.get(".dark-mode-toggle").click();
    cy.get("body").should("not.have.class", "dark-mode");
    cy.get("canvas#pieChart").should("exist");
  });
});
