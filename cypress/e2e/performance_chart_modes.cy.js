// cypress/e2e/performance_chart_modes.cy.js

const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

function setRow(row, { ticker, shares, buyPrice, date }) {
  cy.get(`#ticker-${row}`).clear().type(ticker);
  cy.get(`#shares-${row}`).clear().type(String(shares));
  if (buyPrice !== undefined) cy.get(`#purchase-${row}`).clear().type(String(buyPrice));
  if (date) cy.get(`#date-${row}`).clear().type(date);
}

function clickVisualize() {
  cy.contains("button", /visualize portfolio/i).click();
}

describe("Performance Chart — historical vs estimated modes", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
  });

  it("uses Estimated chart when historical data is empty and hides time-range buttons", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 150 } });

    // Return EMPTY historical data -> triggers estimated chart in your code
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });

    setRow(0, { ticker: "AAPL", shares: 1, buyPrice: 100, date: "21/02/2021" });

    clickVisualize();

    // The title text for estimated chart should exist (from your code)
    cy.contains("Estimated Growth", { timeout: 10000 }).should("exist");

    // Time range buttons should be hidden in estimated mode
    cy.get("#range-7D").should("not.be.visible");
    cy.get("#range-30D").should("not.be.visible");
    cy.get("#range-90D").should("not.be.visible");
    cy.get("#range-1Y").should("not.be.visible");
    cy.get("#range-ALL").should("not.be.visible");

    // Chart canvas should still be visible
    cy.get("#performanceChart").should("be.visible");
  });

  it("uses Historical chart when historical data exists and shows time-range buttons", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 150 } });

    // Provide minimal historical series with CLOSE prices
    // Dates must be YYYY-MM-DD; your code reads .close
    const hist = {
      "2021-02-21": { close: 100 },
      "2021-02-22": { close: 110 },
      "2021-02-23": { close: 105 },
      "2021-02-24": { close: 120 }
    };

    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: hist } });

    setRow(0, { ticker: "AAPL", shares: 1, buyPrice: 100, date: "21/02/2021" });

    clickVisualize();

    // Estimated warning should NOT be shown
    cy.contains("Estimated Growth").should("not.exist");

    // Time range buttons should be visible in historical mode
    cy.get("#range-7D").should("be.visible");
    cy.get("#range-30D").should("be.visible");
    cy.get("#range-90D").should("be.visible");
    cy.get("#range-1Y").should("be.visible");
    cy.get("#range-ALL").should("be.visible");

    // Chart should be visible
    cy.get("#performanceChart").should("be.visible");

    // Optional: clicking time range should not crash
    cy.get("#range-ALL").click();
    cy.get("#performanceChart").should("be.visible");
  });
});
