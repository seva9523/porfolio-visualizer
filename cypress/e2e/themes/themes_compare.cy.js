// cypress/e2e/themes/themes_compare.cy.js

describe("Theme Explorer - Compare", () => {
  const BASE_URL = Cypress.env("baseUrl") || "https://porfolio-visualizer-taca.vercel.app";

  function waitForPageReady() {
    cy.get('#load-bar', { timeout: 25000 }).should('not.be.visible');
    cy.get('[data-testid="theme-card"]', { timeout: 20000 })
      .should('have.length.greaterThan', 10);
    
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

  it("compare mode activates", () => {
    cy.get('[data-testid="compare-toggle"]').click({ force: true });
    cy.wait(1500);
    cy.get('#cmp-bar').should('exist');
  });
});
