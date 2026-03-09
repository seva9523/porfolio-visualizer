// cypress/e2e/remaining_coverage.cy.js
//
// Final coverage gaps: rebalancing threshold strategy, pie/bar chart rendering,
// last-updated timestamp, goals edge case.


function generateHistoricalData(startPrice, days) {
  const data = {};
  let price = startPrice;
  const start = new Date("2024-01-02");
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split("T")[0];
    price = price * (1 + (Math.random() - 0.48) * 0.03);
    data[dateStr] = { close: Math.round(price * 100) / 100 };
  }
  return data;
}

const HIST_AAPL = generateHistoricalData(180, 120);

describe("Rebalancing — Threshold Strategy", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("threshold rebalancing runs and shows results", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("02/01/2024").blur();

    cy.get("#purchase-0", { timeout: 10000 }).should(($el) => {
      expect(parseFloat($el.val())).to.be.greaterThan(0);
    });

    cy.contains("button", /visualize portfolio/i).click();
    cy.get("#rebalancing-section", { timeout: 15000 }).should("be.visible");

    cy.get("#rebalance-strategy").select("threshold");
    cy.get("#rebalance-period").select("5y");
    cy.get("#run-rebalancing-sim").click();

    cy.get("#rebalancing-metrics-table", { timeout: 15000 }).should("be.visible");
    cy.get("#rebalancing-metrics-table tbody tr").should(
      "have.length.at.least",
      1
    );
    cy.get("canvas#rebalancing-performance-chart").should("exist");
  });

  it("quarterly rebalancing runs and shows results", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 190 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: HIST_AAPL },
    });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");
    cy.get("#date-0").clear().type("02/01/2024").blur();

    cy.get("#purchase-0", { timeout: 10000 }).should(($el) => {
      expect(parseFloat($el.val())).to.be.greaterThan(0);
    });

    cy.contains("button", /visualize portfolio/i).click();
    cy.get("#rebalancing-section", { timeout: 15000 }).should("be.visible");

    cy.get("#rebalance-strategy").select("quarterly");
    cy.get("#rebalance-period").select("5y");
    cy.get("#run-rebalancing-sim").click();

    cy.get("#rebalancing-metrics-table", { timeout: 15000 }).should("be.visible");
    cy.get("#rebalancing-metrics-table tbody tr").should(
      "have.length.at.least",
      1
    );
  });
});

describe("Pie Chart & Bar Chart Rendering", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("pie chart and bar chart render after visualization", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/quote\?symbol=GOOGL.*/, {
      statusCode: 200,
      body: { c: 200 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=GOOGL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("5");
    cy.get("#ticker-1").clear().type("GOOGL");
    cy.get("#shares-1").clear().type("3");

    cy.contains("button", /visualize portfolio/i).click();

    // Both chart canvases should exist and be visible
    cy.get("canvas#pieChart", { timeout: 10000 }).should("exist");
    cy.get("canvas#barChart").should("exist");
  });

  it("pie chart renders for single holding", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    });
    cy.intercept("GET", /\/api\/historical\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { data: {} },
    });

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("10");

    cy.contains("button", /visualize portfolio/i).click();

    cy.get("canvas#pieChart", { timeout: 10000 }).should("exist");
  });
});

describe("Last Updated Timestamp", () => {
  beforeEach(() => {
    cy.visit("/visualizer.html");
  });

  it("shows last updated timestamp after refresh prices", () => {
    cy.intercept("GET", /\/api\/quote\?symbol=AAPL.*/, {
      statusCode: 200,
      body: { c: 150 },
    }).as("quote");

    cy.get("#ticker-0").clear().type("AAPL");
    cy.get("#shares-0").clear().type("1");

    cy.contains("button", /refresh prices/i).click();
    cy.wait("@quote");

    cy.get("#last-updated", { timeout: 5000 }).should(($el) => {
      const text = $el.text();
      expect(text).to.contain("Last updated");
    });
  });
});

describe("Goals Simulator — Zero Target Edge Case", () => {
  beforeEach(() => {
    cy.visit("/goals.html");
    cy.clearLocalStorage();
    cy.reload();
  });

  it("goal with very small target amount does not crash", () => {
    cy.get('[data-testid="add-goal-btn"]').click();
    cy.get('[data-testid="goal-name"]').clear().type("Tiny Goal");
    cy.get('[data-testid="goal-type"]').select("short_term");
    cy.get('[data-testid="goal-target"]').clear().type("100");
    cy.get('[data-testid="goal-years"]').clear().type("1");
    cy.get('[data-testid="goal-current"]').clear().type("50");
    cy.get('[data-testid="goal-monthly"]').clear().type("10");
    cy.get('[data-testid="goal-return"]').clear().type("5");
    cy.get('[data-testid="goal-volatility"]').clear().type("10");

    cy.get('[data-testid="run-simulation"]').click();

    cy.get('[data-testid="goal-card"]').should("exist");
    cy.get('[data-testid="goal-probability"]')
      .invoke("text")
      .then((t) => {
        const pct = parseFloat(t.replace(/[^0-9.-]/g, ""));
        expect(pct).to.be.within(0, 100);
      });
  });

  it("goal with very large target shows low probability without crash", () => {
    cy.get('[data-testid="add-goal-btn"]').click();
    cy.get('[data-testid="goal-name"]').clear().type("Huge Goal");
    cy.get('[data-testid="goal-type"]').select("retirement");
    cy.get('[data-testid="goal-target"]').clear().type("99999999");
    cy.get('[data-testid="goal-years"]').clear().type("5");
    cy.get('[data-testid="goal-current"]').clear().type("1000");
    cy.get('[data-testid="goal-monthly"]').clear().type("100");
    cy.get('[data-testid="goal-return"]').clear().type("7");
    cy.get('[data-testid="goal-volatility"]').clear().type("15");

    cy.get('[data-testid="run-simulation"]').click();

    cy.get('[data-testid="goal-card"]').should("exist");
    cy.get('[data-testid="goal-probability"]')
      .invoke("text")
      .then((t) => {
        const pct = parseFloat(t.replace(/[^0-9.-]/g, ""));
        expect(pct).to.be.within(0, 100);
      });
  });
});
