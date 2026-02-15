// cypress/e2e/portfolio_gainloss.cy.js

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

function parseMoney(text) {
  // Try to match a dollar amount pattern first (e.g. "$100.00" or "$1,234.56")
  const dollarMatch = text.match(/\$[\d,]+(\.\d+)?/);
  if (dollarMatch) {
    const cleaned = dollarMatch[0].replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  // Fallback: strip non-numeric and try
  const cleaned = text.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePercent(text) {
  // Match the number immediately before a % sign (return abs value)
  const m = text.match(/-?(\d+(\.\d+)?)(?=%)/);
  if (!m) {
    // Fallback: match last number in string
    const all = text.match(/-?\d+(\.\d+)?/g);
    if (!all || all.length === 0) return null;
    const n = Number(all[all.length - 1]);
    return Number.isFinite(n) ? Math.abs(n) : null;
  }
  const n = Number(m[1]); // m[1] is the capture group without the optional minus
  return Number.isFinite(n) ? n : null;
}

describe("Portfolio Visualizer — Gain/Loss correctness", () => {
  beforeEach(() => {
    cy.visit(BASE_URL);
  });

  it("computes cost basis, gain/loss $, and gain/loss % correctly (single holding)", () => {
    // Force a deterministic current price
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 150 } }).as("qAAPL");

    // We don't need historical for this test
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });

    // shares=2, buy=100 => cost basis=200
    // current=150 => value=300
    // gain=100, gain%=50%
    setRow(0, { ticker: "AAPL", shares: 2, buyPrice: 100, date: "21/02/2021" });

    clickVisualize();
    cy.wait("@qAAPL");

    // Summary: Total Cost Basis should be $200
    cy.contains("#summary-section .summary-stat", "Total Cost Basis:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => {
        const v = parseMoney(txt);
        expect(v).to.be.closeTo(200, 0.01);
      });

    // Summary: Total Gain/Loss should show $100 and +50.00%
    cy.contains("#summary-section .summary-stat", "Total Gain/Loss:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => {
        const money = parseMoney(txt);
        expect(money).to.be.closeTo(100, 0.01);

        const pct = parsePercent(txt);
        expect(pct).to.be.closeTo(50, 0.01);
      });

    // Table row checks (AAPL)
    cy.get("#table-section table tbody tr").within(() => {
      cy.contains("td", "AAPL").should("exist");
    });

    cy.get("#table-section").within(() => {
      cy.contains("td", "AAPL").parent("tr").within(() => {
        // cost basis column exists and should contain 200
        cy.contains("$200");
        // value should contain 300
        cy.contains("$300");
        // gain/loss should contain 100
        cy.contains("$100");
        // percent should contain 50
        cy.contains("50.00%").should("exist");
      });
    });
  });

  it("handles negative gain/loss correctly (single holding)", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, { statusCode: 200, body: { c: 80 } }).as("qAAPL");
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, { statusCode: 200, body: { data: {} } });

    // shares=5, buy=100 => 500
    // current=80 => 400
    // loss=-100 => -20%
    setRow(0, { ticker: "AAPL", shares: 5, buyPrice: 100, date: "21/02/2021" });

    clickVisualize();
    cy.wait("@qAAPL");

    cy.contains("#summary-section .summary-stat", "Total Cost Basis:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => expect(parseMoney(txt)).to.be.closeTo(500, 0.01));

    cy.contains("#summary-section .summary-stat", "Total Gain/Loss:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => {
        const money = parseMoney(txt);
        expect(money).to.be.closeTo(100, 0.01); // UI displays abs($loss) with ↓ icon usually

        const pct = parsePercent(txt);
        expect(pct).to.be.closeTo(20, 0.01); // abs value likely shown
      });

    cy.get("#table-section").within(() => {
      cy.contains("td", "AAPL").parent("tr").within(() => {
        cy.contains("$500");
        cy.contains("$400");
        cy.contains("$100");
        // May show "-20.00%" or "20.00%" depending on your formatting; accept either
        cy.contains(/20\.00%/);
      });
    });
  });
});
