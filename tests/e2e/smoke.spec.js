const { test, expect } = require("@playwright/test");

test("home page responds", async ({ page }) => {
  const response = await page.goto("/");
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle(/Sharpening Your Saw/);
});
