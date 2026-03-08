const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "https://www.wealthview.pro",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: false,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 30000,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
  },
});
