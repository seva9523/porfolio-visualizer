// cypress/e2e/portfolio_management.cy.js
//
// Tests for multi-portfolio management: create, rename, delete, switch, persistence.


// Shared stubs that persist across the test
let promptStub;
let confirmStub;
let alertStub;

describe("Portfolio Management — CRUD + persistence", () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    // Stub prompt/confirm/alert BEFORE the page loads so they are in place
    // when window.onload fires
    cy.visit("/visualizer.html", {
      onBeforeLoad(win) {
        promptStub = cy.stub(win, "prompt");
        confirmStub = cy.stub(win, "confirm");
        alertStub = cy.stub(win, "alert");
      },
    });
  });

  it("starts with a Default Portfolio selected", () => {
    cy.get("#portfolio-selector").should("exist");
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
  });

  it("creates a new portfolio and switches to it", () => {
    promptStub.returns("My Tech Stocks");

    cy.contains("button", "New").click();

    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "My Tech Stocks"
    );
    cy.get("#portfolio-selector option").should("have.length", 2);
    cy.get(".holding-input").should("have.length", 3);
  });

  it("switches between portfolios and preserves holdings", () => {
    cy.intercept("GET", /\/api\/quote/, { statusCode: 200, body: { c: 100 } });
    cy.intercept("GET", /\/api\/historical/, { statusCode: 200, body: { data: {} } });
    cy.intercept("GET", /\/api\/search/, { statusCode: 200, body: { result: [] } });

    // Fill a holding in the default portfolio
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("10");

    // Create a new portfolio
    promptStub.returns("Bonds Portfolio");
    cy.contains("button", "New").click();

    cy.get(".holding-input").should("have.length", 3);
    cy.get("#ticker-0").clear().type("BND");
    cy.get("#shares-0").clear().type("50");

    // Switch back to Default Portfolio
    cy.get("#portfolio-selector").select("Default Portfolio");

    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "AAPL");
    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Shares"]')
      .should("have.value", "10");

    // Switch to Bonds Portfolio
    cy.get("#portfolio-selector").select("Bonds Portfolio");

    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "BND");
    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Shares"]')
      .should("have.value", "50");
  });

  it("renames the current portfolio", () => {
    // Create a second portfolio first
    promptStub.onFirstCall().returns("Temp Portfolio");
    cy.contains("button", "New").click();

    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Temp Portfolio"
    );

    // Now rename it
    promptStub.onSecondCall().returns("Renamed Portfolio");
    cy.contains("button", "Rename").click();

    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Renamed Portfolio"
    );
  });

  it("deletes a portfolio and switches to the remaining one", () => {
    promptStub.returns("To Delete");
    confirmStub.returns(true);

    cy.contains("button", "New").click();
    cy.get("#portfolio-selector option").should("have.length", 2);

    cy.contains("button", "Delete").click();

    cy.get("#portfolio-selector option").should("have.length", 1);
    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
  });

  it("cannot delete the last remaining portfolio", () => {
    confirmStub.returns(true);

    cy.contains("button", "Delete").click();

    cy.then(() => {
      expect(alertStub).to.have.been.calledOnce;
    });

    cy.get("#portfolio-selector option").should("have.length", 1);
  });

  it("portfolio data persists after page reload", () => {
    cy.intercept("GET", /\/api\/search/, { statusCode: 200, body: { result: [] } });

    cy.get("#ticker-0").clear().type("MSFT");
    cy.get("#shares-0").clear().type("25");

    promptStub.returns("Second");
    cy.contains("button", "New").click();

    // Switch back to default to trigger save
    cy.get("#portfolio-selector").select("Default Portfolio");

    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "MSFT");

    // Reload — stubs will be gone but we only need to check data persistence
    cy.reload();

    cy.get("#portfolio-selector option:selected").should(
      "contain.text",
      "Default Portfolio"
    );
    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "MSFT");
    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Shares"]')
      .should("have.value", "25");

    cy.get("#portfolio-selector option").should("have.length", 2);
  });
});
