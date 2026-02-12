const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://porfolio-visualizer-taca.vercel.app",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: false
  },
});
