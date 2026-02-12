describe('Portfolio Visualizer', () => {
  it('loads the homepage', () => {
    cy.visit('/');
    cy.contains('Portfolio'); // checks if the page has text 'Portfolio'
  });

  it('checks if input fields exist', () => {
    cy.get('input').should('exist');
  });
});
