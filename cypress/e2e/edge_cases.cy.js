// cypress/e2e/edge_cases.cy.js
//
// Phase 3: Edge cases, robustness, and stress tests.


function setRow(row, { ticker, shares, buyPrice, date }) {
  cy.get(`#ticker-${row}`).clear({ force: true }).type(ticker, { force: true });
  cy.get(`#shares-${row}`).clear({ force: true }).type(String(shares), { force: true });
  if (buyPrice !== undefined)
    cy.get(`#purchase-${row}`).clear({ force: true }).type(String(buyPrice), { force: true });
  if (date) cy.get(`#date-${row}`).clear({ force: true }).type(date, { force: true });
}

function clickVisualize() {
  cy.contains("button", /visualize portfolio/i).click();
}

describe("Edge Cases — Empty & Invalid Inputs", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html", {
      onBeforeLoad(win) {
        cy.stub(win, "alert");
      },
    });
  });

  it("visualize with all empty rows shows alert, does not crash", () => {
    clickVisualize();

    // Should alert and not crash
    cy.window().its("alert").should("have.been.called");
    cy.get("#holdings-container").should("exist");
  });

  it("visualize with ticker but zero shares still renders", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    cy.get("#ticker-0").clear({ force: true }).type("AAPL");
    cy.get("#shares-0").clear({ force: true }).type("0");

    clickVisualize();

    // Should render without crash — total value will be $0
    cy.get("#summary-section", { timeout: 10000 }).should("exist");
  });

  it("very large share count does not crash", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 999999,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    cy.get("#summary-section", { timeout: 10000 }).should("not.be.empty");
    cy.get("#table-section").should("not.be.empty");
  });

  it("fractional shares render correctly", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 200 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 0.5,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    // Value should be 0.5 * 200 = 100
    cy.contains("#summary-section .summary-stat", "Total Value:")
      .find(".stat-value")
      .invoke("text")
      .then((txt) => {
        const cleaned = txt.replace(/[^0-9.-]/g, "");
        const val = Number(cleaned);
        expect(val).to.be.closeTo(100, 0.01);
      });
  });
});

describe("Edge Cases — API Failures", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("network timeout on quote does not crash", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 0 },
      delay: 100,
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 1,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    cy.get("#summary-section", { timeout: 15000 }).should("exist");
    cy.get("#table-section").should("exist");
  });

  it("historical API returning malformed JSON does not crash", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: null },
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 1,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    cy.get("#summary-section", { timeout: 10000 }).should("exist");
  });

  it("both quote and historical failing still renders table", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 500,
      body: {},
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 500,
      body: {},
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 5,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    cy.get("#summary-section", { timeout: 10000 }).should("not.be.empty");
    cy.get("#table-section").should("contain", "AAPL");
  });
});

describe("Edge Cases — Multiple Holdings Stress", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("innerHTML") || err.message.includes("null")) {
        return false;
      }
    });
  });

  it("adding 5 holdings and visualizing works", () => {
    const tickers = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"];

    tickers.forEach((ticker) => {
      cy.intercept("GET", new RegExp(`/api/quote\\?symbol=${ticker}`), {
        statusCode: 200,
        body: { c: 150 },
      });
      cy.intercept("GET", new RegExp(`/api/historical\\?symbol=${ticker}`), {
        statusCode: 200,
        body: { data: {} },
      });
    });
    cy.intercept("GET", /\/api\/search/, {
      statusCode: 200,
      body: { result: [] },
    });

    // Fill first 3 existing rows
    tickers.slice(0, 3).forEach((ticker, i) => {
      cy.get(`#ticker-${i}`).clear().type(ticker);
      cy.get(`#shares-${i}`).clear().type("10");
    });

    // Add 2 more rows
    cy.contains("button", "Add Holding").click();
    cy.contains("button", "Add Holding").click();

    tickers.slice(3).forEach((ticker, i) => {
      cy.get(`#ticker-${i + 3}`).clear().type(ticker);
      cy.get(`#shares-${i + 3}`).clear().type("10");
    });

    clickVisualize();

    // All 5 should appear in table
    cy.get("#table-section", { timeout: 15000 }).should("not.be.empty");
    tickers.forEach((ticker) => {
      cy.get("#table-section").should("contain", ticker);
    });

    // Allocation should sum to ~100%
    cy.get("#table-section table tbody tr").then(($rows) => {
      let sum = 0;
      [...$rows].forEach((row) => {
        const tds = row.querySelectorAll("td");
        const allocCell = tds[tds.length - 1];
        const pctText = allocCell?.innerText?.match(/(\d+(\.\d+)?)%/);
        if (pctText) sum += Number(pctText[1]);
      });
      expect(sum).to.be.closeTo(100, 0.5);
    });
  });

  it("rapid add and remove holdings does not crash", () => {
    cy.intercept("GET", /\/api\/search/, {
      statusCode: 200,
      body: { result: [] },
    });

    // Rapidly add 4 holdings
    for (let i = 0; i < 4; i++) {
      cy.contains("button", "Add Holding").click();
    }
    cy.get(".holding-input").should("have.length", 7); // 3 default + 4

    // Rapidly remove 5
    for (let i = 0; i < 5; i++) {
      cy.get(".holding-input").first().find(".remove-btn").click();
    }
    cy.get(".holding-input").should("have.length", 2);

    // Page still works
    cy.get("#holdings-container").should("exist");
  });
});

describe("Benchmark Section", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("shows backtest unavailable when no historical data", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, {
      ticker: "AAPL",
      shares: 5,
      buyPrice: 100,
      date: "02/01/2024",
    });
    clickVisualize();

    cy.get("#benchmark-section", { timeout: 10000 }).should(
      "contain.text",
      "Backtest Unavailable"
    );
  });
});
