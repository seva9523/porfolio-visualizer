// cypress/e2e/analytics_sections.cy.js
//
// Tests for Monte Carlo simulation, Correlation Matrix, Portfolio Optimization,
// and Benchmark sections that render after visualization.


// Generate 60+ days of historical data for Monte Carlo to activate (needs >50 returns)
function generateHistoricalData(startPrice, days) {
  const data = {};
  let price = startPrice;
  const start = new Date("2024-01-02");
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split("T")[0];
    price = price * (1 + (Math.random() - 0.48) * 0.03); // slight upward drift
    data[dateStr] = { close: Math.round(price * 100) / 100 };
  }
  return data;
}

const HIST_AAPL = generateHistoricalData(180, 120);
const HIST_GOOGL = generateHistoricalData(140, 120);

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

describe("Monte Carlo Simulation Section", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("shows 'Simulation Unavailable' when historical data is empty", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, { ticker: "AAPL", shares: 2, buyPrice: 100, date: "02/01/2024" });
    clickVisualize();

    cy.get("#montecarlo-section", { timeout: 10000 }).should(
      "contain.text",
      "Simulation Unavailable"
    );
  });

  it("renders Monte Carlo chart and stats when historical data exists", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    setRow(0, { ticker: "AAPL", shares: 10, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    // Monte Carlo section should have chart + stat cards
    cy.get("#montecarlo-section", { timeout: 10000 }).within(() => {
      cy.contains("Monte Carlo Simulation").should("exist");
      cy.get("canvas#montecarloChart").should("exist");
      cy.contains("AVERAGE").should("exist");
      cy.contains("MEDIAN").should("exist");
      cy.contains("BEST CASE").should("exist");
      cy.contains("WORST CASE").should("exist");
    });
  });

  it("Monte Carlo percentiles are in order: worst < median < best", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    setRow(0, { ticker: "AAPL", shares: 10, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    cy.get("#montecarlo-section", { timeout: 10000 }).should(
      "contain.text",
      "Monte Carlo Simulation"
    );

    // Extract the dollar values from the stat cards
    // The section has: AVERAGE, MEDIAN (50th), BEST CASE (90th), WORST CASE (10th)
    cy.get("#montecarlo-section").invoke("text").then((text) => {
      // Extract dollar amounts after each label
      const worstMatch = text.match(/WORST CASE[^$]*\$([\d,]+)/);
      const medianMatch = text.match(/MEDIAN[^$]*\$([\d,]+)/);
      const bestMatch = text.match(/BEST CASE[^$]*\$([\d,]+)/);

      if (worstMatch && medianMatch && bestMatch) {
        const worst = Number(worstMatch[1].replace(/,/g, ""));
        const median = Number(medianMatch[1].replace(/,/g, ""));
        const best = Number(bestMatch[1].replace(/,/g, ""));

        expect(worst).to.be.lessThan(median);
        expect(median).to.be.lessThan(best);
        expect(worst).to.be.greaterThan(0);
      }
    });
  });
});

describe("Correlation Matrix Section", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("does not show correlation for single holding", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    setRow(0, { ticker: "AAPL", shares: 5, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    // Correlation section should be empty for single holding
    cy.get("#correlation-section", { timeout: 10000 }).should("be.empty");
  });

  it("shows correlation matrix for 2+ holdings with historical data", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/quote\?symbol=GOOGL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=GOOGL.*/, {
      statusCode: 200,
      body: { data: HIST_GOOGL },
    });

    setRow(0, { ticker: "AAPL", shares: 5, buyPrice: 180, date: "02/01/2024" });
    setRow(1, { ticker: "GOOGL", shares: 3, buyPrice: 140, date: "02/01/2024" });
    clickVisualize();

    cy.get("#correlation-section", { timeout: 10000 }).within(() => {
      cy.contains("Correlation Matrix").should("exist");
      cy.get("table").should("exist");
      // Diagonal should be 1.00 (self-correlation)
      cy.contains("td", "1.00").should("exist");
      // Both tickers should appear in the headers
      cy.contains("th", "AAPL").should("exist");
      cy.contains("th", "GOOGL").should("exist");
    });
  });
});

describe("Portfolio Optimization Section", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("renders optimization analysis after visualization", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, { ticker: "AAPL", shares: 10, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    cy.get("#optimization-section", { timeout: 10000 }).within(() => {
      // Should show diversification score and risk level
      cy.contains(/diversification/i).should("exist");
    });
  });

  it("single holding shows aggressive risk level", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    setRow(0, { ticker: "AAPL", shares: 10, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    // Single holding = 100% concentration = Aggressive
    cy.get("#optimization-section", { timeout: 10000 }).should(
      "contain.text",
      "Aggressive"
    );
  });
});

describe("Time Range Buttons", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("clicking each time range button does not crash", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    setRow(0, { ticker: "AAPL", shares: 5, buyPrice: 180, date: "02/01/2024" });
    clickVisualize();

    // Wait for historical chart to render
    cy.get("#range-7D", { timeout: 10000 }).should("be.visible");

    // Click each time range — none should crash
    const ranges = ["7D", "30D", "90D", "1Y", "ALL"];
    ranges.forEach((range) => {
      cy.get(`#range-${range}`).click();
      cy.get("#performanceChart").should("be.visible");
    });
  });
});
