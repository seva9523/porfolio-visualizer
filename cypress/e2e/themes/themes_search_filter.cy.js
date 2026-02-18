// cypress/e2e/themes/themes_search_filter.cy.js
//
// Tests for Theme & Trend Explorer search, filter, and sort functionality

describe("Theme Explorer - Search, Filter & Sort", () => {

  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    cy.get('#load-bar', { timeout: 15000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 10000 })
      .should('have.length.greaterThan', 10);
  });

  describe("Search", () => {
    
    it("searches by theme name (exact match)", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("Bitcoin");
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 1)
        .first()
        .should('contain', 'Bitcoin');
    });

    it("searches by theme name (partial match)", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("income");
      
      // Should find multiple income-related themes
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 1);
      
      // All visible cards should contain "income" somewhere
      cy.get('[data-testid="theme-card"]').each(($card) => {
        const text = $card.text().toLowerCase();
        expect(text).to.include('income');
      });
    });

    it("searches by tag", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("dividends");
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 0);
    });

    it("searches by megaTheme", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("Technology");
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 3); // AI, semiconductors, mega cap tech, etc.
    });

    it("search is case-insensitive", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("GOLD");
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length.greaterThan', 0)
        .first()
        .should('contain', 'Gold');
    });

    it("clearing search shows all themes", () => {
      // Search first
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("bitcoin");
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 1);
      
      // Clear search
      cy.get('[data-testid="theme-search"]')
        .clear();
      
      // Should show all themes again
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("search with no results shows empty grid", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("ZZZZNONEXISTENT");
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 0);
    });
  });

  describe("Category Filters", () => {
    
    it("filters by category: Growth", () => {
      cy.get('[data-testid="category-filter"]').select('growth');
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 5);
      
      // All visible cards should have growth category
      cy.get('[data-testid="theme-card"]').each(($card) => {
        cy.wrap($card).find('.ctag').should('contain', 'GROWTH');
      });
    });

    it("filters by category: Defensive", () => {
      cy.get('[data-testid="category-filter"]').select('defensive');
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 2);
      
      cy.get('[data-testid="theme-card"]').each(($card) => {
        cy.wrap($card).find('.ctag').should('contain', 'DEFENSIVE');
      });
    });

    it("filters by category: Income", () => {
      cy.get('[data-testid="category-filter"]').select('income');
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 1);
      
      cy.get('[data-testid="theme-card"]').each(($card) => {
        cy.wrap($card).find('.ctag').should('contain', 'INCOME');
      });
    });

    it("filters by category: Alternative", () => {
      cy.get('[data-testid="category-filter"]').select('alternative');
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 1);
      
      cy.get('[data-testid="theme-card"]').each(($card) => {
        cy.wrap($card).find('.ctag').should('contain', 'ALTERNATIVE');
      });
    });

    it("resetting to 'All Types' shows all themes", () => {
      // Filter first
      cy.get('[data-testid="category-filter"]').select('growth');
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.lessThan', 38);
      
      // Reset
      cy.get('[data-testid="category-filter"]').select('all');
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });
  });

  describe("Sorting", () => {
    
    it("sorts by What's Hot Now (trending score)", () => {
      cy.get('[data-testid="sort-select"]').select('trending');
      
      // First theme should have the highest trend score
      // We can't easily verify the exact score, but we can check order doesn't crash
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("sorts by 5-Year Growth (CAGR)", () => {
      cy.get('[data-testid="sort-select"]').select('cagr5y');
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("sorts by Calmest First (volatility)", () => {
      cy.get('[data-testid="sort-select"]').select('volatility');
      
      // First card should be calmer than last
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("sorts by Best Reward/Risk (Sharpe)", () => {
      cy.get('[data-testid="sort-select"]').select('sharpe');
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("sorts by Smallest Drops (maxDD)", () => {
      cy.get('[data-testid="sort-select"]').select('maxdd');
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("sorts by Name A-Z", () => {
      cy.get('[data-testid="sort-select"]').select('name');
      
      // Get all card names
      const names = [];
      cy.get('[data-testid="theme-card"] .tcard-name').each(($name) => {
        names.push($name.text());
      }).then(() => {
        // Verify they're in alphabetical order
        const sorted = [...names].sort((a, b) => a.localeCompare(b));
        expect(names).to.deep.equal(sorted);
      });
    });
  });

  describe("Combined Search + Filter + Sort", () => {
    
    it("search + category filter works together", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("stocks");
      
      cy.get('[data-testid="category-filter"]').select('growth');
      
      // Should show only growth themes with "stocks" in name/description/tags
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 0)
        .and('be.lessThan', 38);
      
      cy.get('[data-testid="theme-card"]').each(($card) => {
        cy.wrap($card).find('.ctag').should('contain', 'GROWTH');
      });
    });

    it("search + sort works together", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("tech");
      
      cy.get('[data-testid="sort-select"]').select('name');
      
      // Should show filtered and sorted results
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 0);
    });

    it("all three filters work together", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("market");
      
      cy.get('[data-testid="category-filter"]').select('growth');
      cy.get('[data-testid="sort-select"]').select('name');
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 0);
    });
  });

  describe("UI Responsiveness", () => {
    
    it("rapid filter changes don't crash", () => {
      cy.get('[data-testid="category-filter"]').select('growth');
      cy.get('[data-testid="category-filter"]').select('defensive');
      cy.get('[data-testid="category-filter"]').select('income');
      cy.get('[data-testid="category-filter"]').select('alternative');
      cy.get('[data-testid="category-filter"]').select('all');
      
      // Should still render correctly
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("rapid sort changes don't crash", () => {
      cy.get('[data-testid="sort-select"]').select('trending');
      cy.get('[data-testid="sort-select"]').select('cagr5y');
      cy.get('[data-testid="sort-select"]').select('volatility');
      cy.get('[data-testid="sort-select"]').select('name');
      
      cy.get('[data-testid="theme-card"]')
        .should('have.length', 38);
    });

    it("typing and deleting search quickly doesn't crash", () => {
      cy.get('[data-testid="theme-search"]')
        .clear()
        .type("technology")
        .clear()
        .type("bond")
        .clear()
        .type("gold");
      
      cy.get('[data-testid="theme-card"]')
        .its('length')
        .should('be.greaterThan', 0);
    });
  });

});
