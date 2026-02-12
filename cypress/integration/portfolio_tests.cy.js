/// <reference types="cypress" />

describe('Portfolio Visualizer Live Site QA', () => {
  const baseUrl = 'https://porfolio-visualizer-taca.vercel.app/';

  it('Calculates expected return correctly', () => {
    cy.visit(baseUrl);

    cy.get('#asset-name-0').clear().type('Stock A');
    cy.get('#asset-weight-0').clear().type('50');
    cy.get('#asset-return-0').clear().type('10');

    cy.get('#asset-name-1').clear().type('Bond B');
    cy.get('#asset-weight-1').clear().type('50');
    cy.get('#asset-return-1').clear().type('5');

    cy.get('#simulate-portfolio').click();

    cy.get('#expected-return').invoke('text').then(text => {
      const actual = parseFloat(text.replace('%',''))/100;
      expect(actual).to.be.closeTo(0.075, 0.001);
    });
  });

  it('Runs financial goals Monte Carlo simulation', () => {
    cy.get('#goal-type').select('Retirement');
    cy.get('#current-savings').clear().type('200000');
    cy.get('#monthly-contribution').clear().type('1500');
    cy.get('#target-amount').clear().type('1200000');
    cy.get('#time-horizon').clear().type('30');

    cy.get('#run-simulation').click();

    cy.get('#median-outcome').invoke('text').then(text => {
      const median = parseFloat(text.replace('€','').replace(',',''));
      expect(median).to.be.within(1100000, 1250000);
    });
  });

  it('Checks rebalancing simulator', () => {
    cy.get('#rebalance-strategy').select('Annual');
    cy.get('#run-rebalance').click();

    cy.get('#final-allocation-stocks').invoke('text').then(text => {
      const stockWeight = parseFloat(text.replace('%',''));
      expect(stockWeight).to.be.closeTo(60, 2);
    });
  });
});
