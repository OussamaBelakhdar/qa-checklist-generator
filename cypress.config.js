import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        specPattern: "*.cy.js",
        supportFile: false,
        video: false,
        screenshotOnRunFailure: true,
        viewportWidth: 1280,
        viewportHeight: 720,
        retries: {
            runMode: 2,
            openMode: 0,
        }
    },
});
