// cypress/e2e/portfolio_math_and_failures.cy.js

const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

function setRow(row, { ticker, shares, date }) {
  cy.get(`#ticker-${row}`).clear().type(ticker);
  cy.get(`#shares-${row}`).clear().type(String(shares));
  if (date) cy.get(`#date-${row}`).clear().type(date);
}

function clickVisualize() {
  cy.contains("button", /visualize portfolio/i).click();
}

function clickRefreshPrices() {
  cy.contains("button", /refresh prices only/i).click();
}

function parseMoney(text) {
  // "$12,345.67" -> 12345.67
  const cleaned = text.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

describe("Portfolio Visualizer — math correctness + API failure handling", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
  });

  it("computes Total Value correctly from stubbed quotes (2 holdings)", () => {
    // Stub quotes
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 100 } }).as("qAAPL");
    cy.intercept("GET", /\/api\/quote\?symbol=GOOGL.*/, { statusCode: 200, body: { c: 200 } }).as("qGOOGL");

    // Historical is optional for this test – return empty but valid
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });
    cy.intercept("GET", /\/api\/historical\?symbol=GOOGL.*/, { statusCode: 200, body: { data: {} } });

    // Fill rows
    setRow(0, { ticker: "AAPL", shares: 2, date: "21/02/2021" });
    setRow(1, { ticker: "GOOGL", shares: 3, date: "21/02/2021" });

    clickVisualize();

    cy.wait(["@qAAPL", "@qGOOGL"]);

    // Total value should be 2*100 + 3*200 = 800
    cy.contains("#summary-section", "Total Value:")
      .parent()
      .invoke("text")
      .then((t) => {
        const money = parseMoney(t);
        // summary box contains many numbers; safer: check the "Total Value" line specifically
      });

    // safer: locate Total Value row and read its value span
    cy.contains("#summary-section .summary-stat", "Total Value:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => {
        const total = parseMoney(txt);
        expect(total).to.be.closeTo(800, 0.01);
      });

    // Table rows should reflect individual values too
    cy.get("#table-section").within(() => {
      cy.contains("td", "AAPL").parent("tr").within(() => {
        cy.contains("$").then(($td) => {
          // "Value" column is later; easiest is assert the row contains "$200.00" somewhere
          cy.contains("$200");
        });
      });

      cy.contains("td", "GOOGL").parent("tr").within(() => {
        cy.contains("$600");
      });
    });
  });

  it("allocation percentages sum to ~100% (table Allocation column)", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 100 } });
    cy.intercept("GET", /\/api\/quote\?symbol=GOOGL.*/, { statusCode: 200, body: { c: 200 } });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });
    cy.intercept("GET", /\/api\/historical\?symbol=GOOGL.*/, { statusCode: 200, body: { data: {} } });

    setRow(0, { ticker: "AAPL", shares: 1, date: "21/02/2021" });  // $100
    setRow(1, { ticker: "GOOGL", shares: 1, date: "21/02/2021" }); // $200

    clickVisualize();

    // Parse Allocation column percentages in table
    cy.get("#table-section table tbody tr").then(($rows) => {
      let sum = 0;
      // Allocation is last column; first line contains "xx.x%"
      [...$rows].forEach((row) => {
        const tds = row.querySelectorAll("td");
        const allocCell = tds[tds.length - 1];
        const pctText = allocCell?.innerText?.match(/(\d+(\.\d+)?)%/);
        if (pctText) sum += Number(pctText[1]);
      });
      expect(sum).to.be.closeTo(100, 0.3); // rounding tolerance
    });
  });

  it("handles /api/quote failure gracefully (no crash, shows placeholder prices)", () => {
    // Quote fails
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 500, body: { error: "boom" } });
    // Historical also fails (should not crash)
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 500, body: { error: "boom" } });

    setRow(0, { ticker: "AAPL", shares: 1, date: "21/02/2021" });

    // If your UI currently alerts, Cypress will still pass as long as it doesn't crash.
    clickVisualize();

    // Expect it still renders summary/table (even if values are 0)
    cy.get("#summary-section").should("not.be.empty");
    cy.get("#table-section").should("not.be.empty");

    // Current price may show "-" and value may show "$0.00" — we accept either as long as no crash
    cy.get("#table-section").contains("AAPL");
  });

  it("handles rate limit (429) on quotes without crashing", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 429, body: { error: "rate limit" } });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });

    setRow(0, { ticker: "AAPL", shares: 1, date: "21/02/2021" });

    clickRefreshPrices(); // this path hits quote too
    // Just verify the app stayed alive and didn't throw uncaught exceptions.
    cy.get("#summary-section").should("exist");
  });

  it("removing a holding updates totals (no stale rows)", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 100 } });
    cy.intercept("GET", /\/api\/quote\?symbol=GOOGL.*/, { statusCode: 200, body: { c: 200 } });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });
    cy.intercept("GET", /\/api\/historical\?symbol=GOOGL.*/, { statusCode: 200, body: { data: {} } });

    setRow(0, { ticker: "AAPL", shares: 1, date: "21/02/2021" });
    setRow(1, { ticker: "GOOGL", shares: 1, date: "21/02/2021" });

    clickVisualize();

    cy.contains("#summary-section .summary-stat", "Total Value:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => expect(parseMoney(txt)).to.be.closeTo(300, 0.01));

    // Remove second row (GOOGL) and re-visualize
    cy.get(".holding-input").eq(1).find(".remove-btn").click();
    clickVisualize();

    cy.contains("#summary-section .summary-stat", "Total Value:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => expect(parseMoney(txt)).to.be.closeTo(100, 0.01));

    cy.get("#table-section").should("contain", "AAPL");
    cy.get("#table-section").should("not.contain", "GOOGL");
  });
});
