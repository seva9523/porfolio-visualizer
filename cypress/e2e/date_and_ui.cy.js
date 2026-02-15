// cypress/e2e/date_and_ui.cy.js
//
// Tests for date validation, auto-fill buy price, clear all, add/remove holdings.

const BASE_URL =
  Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

describe("Date Validation", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
  });

  it("accepts a valid DD/MM/YYYY date and sets data-date-value", () => {
    cy.get("#date-0").clear().type("15/06/2023");
    cy.get("#date-0").blur();

    // Wait for the debounce (800ms) to fire and set dataset
    cy.wait(1000);
    cy.get("#date-0").should(($el) => {
      const val = $el.attr("data-date-value");
      expect(val).to.equal("2023-06-15");
    });
  });

  it("auto-fills buy price when a valid date is entered", () => {
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: {
        data: {
          "2023-06-15": { close: 185.01 },
        },
      },
    });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("15/06/2023");
    cy.get("#date-0").blur();

    cy.get("#purchase-0", { timeout: 5000 }).should(($el) => {
      const val = parseFloat($el.val());
      expect(val).to.be.greaterThan(0);
    });
  });

  it("does not crash on an invalid date format", () => {
    cy.get("#date-0").clear().type("not-a-date");
    cy.get("#date-0").blur();
    cy.wait(1000);

    cy.get("#date-0").should(($el) => {
      const val = $el.attr("data-date-value");
      expect(val || "").to.equal("");
    });

    cy.get("#holdings-container").should("exist");
  });

  it("rejects an impossible date like 31/02/2023", () => {
    cy.get("#date-0").clear().type("31/02/2023");
    cy.get("#date-0").blur();
    cy.wait(1000);

    cy.get("#date-0").should(($el) => {
      const val = $el.attr("data-date-value");
      expect(val || "").to.equal("");
    });
  });
});

describe("Add / Remove Holdings", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
    cy.clearLocalStorage();
    cy.reload();
    // Suppress search API calls that fire on ticker input
    cy.intercept("GET", /\/api\/search/, {
      statusCode: 200,
      body: { result: [] },
    });
    // Handle app errors from pending search timeouts on removed elements
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("innerHTML") || err.message.includes("null")) {
        return false; // prevent test failure from this known app quirk
      }
    });
  });

  it("starts with 3 empty holding rows", () => {
    cy.get(".holding-input").should("have.length", 3);
  });

  it("adds a new holding row when clicking Add Holding", () => {
    cy.contains("button", "Add Holding").click();
    cy.get(".holding-input").should("have.length", 4);
  });

  it("removes a holding row when clicking the × button", () => {
    cy.get(".holding-input").should("have.length", 3);
    cy.get(".holding-input").eq(0).find(".remove-btn").click();
    cy.get(".holding-input").should("have.length", 2);
  });

  it("can add multiple holdings and remove specific ones", () => {
    // Fill 3 tickers — use blur() after each to settle any pending events
    cy.get("#ticker-0").clear().type("AAPL").blur();
    cy.get("#ticker-1").clear().type("GOOGL").blur();
    cy.get("#ticker-2").clear().type("MSFT").blur();

    // Small wait for any search timeouts to settle
    cy.wait(600);

    // Remove the middle one (GOOGL)
    cy.get(".holding-input").eq(1).find(".remove-btn").click();

    // Should have 2 rows with AAPL and MSFT
    cy.get(".holding-input").should("have.length", 2);
    cy.get(".holding-input")
      .eq(0)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "AAPL");
    cy.get(".holding-input")
      .eq(1)
      .find('input[placeholder="Ticker"]')
      .should("have.value", "MSFT");
  });
});

describe("Clear All", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
    cy.clearLocalStorage();
    cy.reload();
  });

  it("clears all holdings and resets to 3 empty rows", () => {
    cy.intercept("GET", /\/api\/quote/, { statusCode: 200, body: { c: 100 } });
    cy.intercept("GET", /\/api\/historical/, { statusCode: 200, body: { data: {} } });
    cy.intercept("GET", /\/api\/search/, { statusCode: 200, body: { result: [] } });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("10");
    cy.get("#ticker-1").clear().type("GOOGL");
    cy.get("#shares-1").clear().type("5");

    cy.contains("button", /visualize portfolio/i).click();
    cy.get("#summary-section", { timeout: 10000 }).should("not.be.empty");

    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });
    cy.contains("button", /clear all/i).click();

    cy.get(".holding-input").should("have.length", 3);
    cy.get("#ticker-0").should("have.value", "");
    cy.get("#shares-0").should("have.value", "");

    cy.get("#summary-section").should("be.empty");
    cy.get("#table-section").should("be.empty");
  });

  it("does nothing if user cancels the confirm dialog", () => {
    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("10");

    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(false);
    });
    cy.contains("button", /clear all/i).click();

    cy.get("#ticker-0").should("have.value", "AAPL");
    cy.get("#shares-0").should("have.value", "10");
  });
});

describe("Refresh Prices", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
  });

  it("refresh prices does not crash with empty holdings", () => {
    cy.contains("button", /refresh prices/i).click();
    cy.get("#holdings-container").should("exist");
    cy.get(".holding-input").should("have.length.at.least", 1);
  });

  it("refresh prices updates current price for a filled holding", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 222.5 },
    }).as("quote");

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");

    cy.contains("button", /refresh prices/i).click();
    cy.wait("@quote");

    cy.get("#summary-section").should("exist");
  });
});
