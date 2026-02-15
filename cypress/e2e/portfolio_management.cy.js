// cypress/e2e/portfolio_management.cy.js
//
// Tests for multi-portfolio management: create, rename, delete, switch, persistence.
// Uses window.prompt/confirm stubs since these are browser dialogs.

const BASE_URL =
  Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

describe("Portfolio Management — CRUD + persistence", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
    cy.clearLocalStorage();
    cy.reload();
  });

  it("starts with a Default Portfolio selected", () => {
    cy.get("#portfolio-selector").should("exist");
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
  });

  it("creates a new portfolio and switches to it", () => {
    // Stub prompt to return a portfolio name
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("My Tech Stocks");
    });

    // Click the New button
    cy.contains("button", "New").click();

    // Selector should now show the new portfolio as selected
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "My Tech Stocks"
    );

    // Selector should have 2 options total
    cy.get("#portfolio-selector option").should("have.length", 2);

    // Holdings container should have empty rows (default 3)
    cy.get(".holding-input").should("have.length", 3);
  });

  it("switches between portfolios and preserves holdings", () => {
    // Stub quote/historical to avoid real API calls
    cy.intercept("GET", /\/api\/quote/, {
      statusCode: 200,
      body: { c: 100 },
    });
    cy.intercept("GET", /\/api\/historical/, {
      statusCode: 200,
      body: { data: {} },
    });

    // Fill a holding in the default portfolio
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("10");

    // Create a new portfolio
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("Bonds Portfolio");
    });
    cy.contains("button", "New").click();

    // Now in "Bonds Portfolio" — fill a different holding
    cy.get("#ticker-0").clear().type("BND");
    cy.get("#shares-0").clear().type("50");

    // Switch back to Default Portfolio
    cy.get("#portfolio-selector").select("Default Portfolio");

    // Should see AAPL with 10 shares
    cy.get("#ticker-0").should("have.value", "AAPL");
    cy.get("#shares-0").should("have.value", "10");

    // Switch to Bonds Portfolio
    cy.get("#portfolio-selector").select("Bonds Portfolio");

    // Should see BND with 50 shares
    cy.get("#ticker-0").should("have.value", "BND");
    cy.get("#shares-0").should("have.value", "50");
  });

  it("renames the current portfolio", () => {
    // First create a second portfolio so rename is allowed
    cy.window().then((win) => {
      cy.stub(win, "prompt")
        .onFirstCall()
        .returns("Temp Portfolio")
        .onSecondCall()
        .returns("Renamed Portfolio");
      cy.stub(win, "alert"); // suppress "create first" alert
    });

    cy.contains("button", "New").click();
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Temp Portfolio"
    );

    // Now rename it
    cy.contains("button", "Rename").click();
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Renamed Portfolio"
    );
  });

  it("deletes a portfolio and switches to the remaining one", () => {
    // Create a second portfolio
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("To Delete");
      cy.stub(win, "confirm").returns(true);
    });

    cy.contains("button", "New").click();
    cy.get("#portfolio-selector option").should("have.length", 2);

    // Delete it
    cy.contains("button", "Delete").click();

    // Should be back to 1 portfolio
    cy.get("#portfolio-selector option").should("have.length", 1);
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
  });

  it("cannot delete the last remaining portfolio", () => {
    cy.window().then((win) => {
      const alertStub = cy.stub(win, "alert");
      cy.stub(win, "confirm").returns(true);

      // Try to delete the only portfolio
      cy.contains("button", "Delete").click();

      // Alert should fire with "Cannot delete" message
      cy.wrap(alertStub).should("have.been.calledOnce");
    });

    // Portfolio should still exist
    cy.get("#portfolio-selector option").should("have.length", 1);
  });

  it("portfolio data persists after page reload", () => {
    // Fill a holding
    cy.get("#ticker-0").clear().type("MSFT");
    cy.get("#shares-0").clear().type("25");

    // Create a second portfolio to trigger save
    cy.window().then((win) => {
      cy.stub(win, "prompt").returns("Second");
    });
    cy.contains("button", "New").click();

    // Switch back to default to save current state
    cy.get("#portfolio-selector").select("Default Portfolio");

    // Reload page
    cy.reload();

    // Default portfolio should still have MSFT
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
    cy.get("#ticker-0").should("have.value", "MSFT");
    cy.get("#shares-0").should("have.value", "25");

    // Second portfolio should still exist
    cy.get("#portfolio-selector option").should("have.length", 2);
  });
});
