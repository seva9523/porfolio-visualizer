describe('Homepage loads', () => {
  it('Visits the homepage successfully', () => {
    cy.visit('https://porfolio-visualizer-taca.vercel.app/');
    cy.contains('Portfolio').should('exist');
  });
});
