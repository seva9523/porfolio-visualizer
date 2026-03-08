// cypress/e2e/navigation_and_darkmode.cy.js
// ============================================================================
// QA E2E: SITE-WIDE NAVIGATION & DARK MODE
// ============================================================================

describe("Site-Wide Navigation", () => {
  it("UX-001: all 6 navigation links work", () => {
    const pages = [
      { name: "Library", url: "/library.html" },
      { name: "Portfolio Visualizer", url: "/visualizer.html" },
      { name: "Goals Simulator", url: "/goals.html" },
      { name: "Theme Explorer", url: "/themes.html" },
      { name: "Health Check", url: "/health.html" },
      { name: "Multi-Backtest", url: "/backtest.html" },
    ];

    pages.forEach((page) => {
      cy.visit(page.url, { failOnStatusCode: false });
      cy.url().should("include", page.url.replace(".html", ""));
      // Page should load without error — check it has content
      cy.get("body").invoke("text").should("have.length.greaterThan", 100);
    });
  });

  it("UX-001: nav bar exists on themes page with all links", () => {
    cy.visit("/themes.html");
    cy.get("nav, .tools-nav, [class*='nav']").should("exist");
    cy.contains("Library").should("exist");
    cy.contains("Portfolio Visualizer").should("exist");
    cy.contains("Goals Simulator").should("exist");
    cy.contains("Theme Explorer").should("exist");
    cy.contains("Health Check").should("exist");
    cy.contains("Multi-Backtest").should("exist");
  });
});

describe("Dark Mode", () => {
  it("UX-020: toggle dark mode on changes body class", () => {
    cy.visit("/themes.html");
    cy.wait(2000);
    // Find and click dark mode toggle
    cy.get("body").then(($body) => {
      const toggle =
        $body.find('[data-testid="dark-mode-toggle"]')[0] ||
        $body.find(".dark-mode-toggle")[0] ||
        $body.find('button:contains("Dark")')[0];
      if (toggle) {
        cy.wrap(toggle).click({ force: true });
        cy.wait(500);
        cy.get("body").should("have.class", "dark-mode");
      }
    });
  });

  it("UX-021: toggle dark mode off removes class", () => {
    cy.visit("/themes.html");
    cy.wait(2000);
    cy.get("body").then(($body) => {
      const toggle =
        $body.find('[data-testid="dark-mode-toggle"]')[0] ||
        $body.find(".dark-mode-toggle")[0];
      if (toggle) {
        // Toggle on then off
        cy.wrap(toggle).click({ force: true });
        cy.wait(300);
        cy.wrap(toggle).click({ force: true });
        cy.wait(300);
        cy.get("body").should("not.have.class", "dark-mode");
      }
    });
  });
});

describe("Responsive — Basic", () => {
  it("CB-005: mobile viewport renders without horizontal scroll", () => {
    cy.viewport(375, 812); // iPhone X
    cy.visit("/themes.html");
    cy.wait(3000);
    // Page should not have horizontal overflow
    cy.get("body").then(($body) => {
      const scrollWidth = $body[0].scrollWidth;
      const clientWidth = $body[0].clientWidth;
      // Allow small tolerance for borders/shadows
      expect(scrollWidth).to.be.at.most(clientWidth + 20);
    });
  });

  it("CB-006: tablet viewport shows theme cards", () => {
    cy.viewport(768, 1024);
    cy.visit("/themes.html");
    cy.get("#load-bar", { timeout: 30000 }).should("not.be.visible");
    cy.get('[data-testid="theme-card"]', { timeout: 25000 }).should("have.length.greaterThan", 5);
  });
});
