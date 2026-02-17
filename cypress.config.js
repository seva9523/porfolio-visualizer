const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "https://portfolio-visualizer-taca.vercel.app",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: false
  },
});
