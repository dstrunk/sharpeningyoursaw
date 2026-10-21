const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:4000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
