// cypress/e2e/themes/themes_basic.cy.js

describe("Theme Explorer - Basic", () => {
  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    
    // Dismiss onboarding modal if present
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="onboarding-modal"]').length > 0) {
        cy.get('[data-testid="onboarding-modal"]').then(($modal) => {
          if ($modal.is(':visible')) {
            cy.get('[data-testid="onboarding-modal"]').find('button').first().click({ force: true });
          }
        });
      }
    });
    
    cy.wait(2000);
  }

  beforeEach(() => {
    cy.visit(`${BASE_URL}/themes.html`);
    waitForPageReady();
  });

  it("page loads", () => {
    cy.get('[data-testid="themes-grid"]').should('exist');
  });

  it("displays 38 themes", () => {
    cy.get('[data-testid="theme-card"]').should("have.length", 38);
  });
});
