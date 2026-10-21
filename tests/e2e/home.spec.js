const { test, expect } = require("@playwright/test");

const LEAD = "Sharpening Your Saw provides expertise in leadership development, team building, executive coaching and strategic development.";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("has the site title and lead sentence as description", async ({ page }) => {
  await expect(page).toHaveTitle("Sharpening Your Saw");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", LEAD);
});

test("header links home and marks Home as the current page", async ({ page }) => {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Sharpening Your Saw" })).toHaveAttribute("href", "/");

  const navigation = header.getByRole("navigation");
  const homeLink = navigation.getByRole("link", { name: "Home" });
  const contactLink = navigation.getByRole("link", { name: "Contact" });
  await expect(homeLink).toHaveAttribute("href", "/");
  await expect(homeLink).toHaveAttribute("aria-current", "page");
  await expect(contactLink).toHaveAttribute("href", "/contact/");
  await expect(contactLink).not.toHaveAttribute("aria-current", /.*/);
});

test("shows the existing copy", async ({ page }) => {
  await expect(page.getByText("Executive coaching & consulting")).toBeVisible();

  const headline = page.getByRole("heading", { level: 1 });
  await expect(headline).toHaveText("Creating positive, sustainable change.");
  await expect(headline.locator("em")).toHaveText("sustainable");

  await expect(page.getByText(LEAD)).toBeVisible();

  await expect(page.getByRole("list", { name: "Services" }).getByRole("listitem")).toHaveText([
    "Leadership development",
    "Team building",
    "Executive coaching",
    "Strategic development",
  ]);
});

test("links to the contact page", async ({ page }) => {
  await expect(page.getByRole("main").getByRole("link", { name: /Start a conversation/ })).toHaveAttribute("href", "/contact/");
});

test("footer shows the current year", async ({ page }) => {
  const year = new Date().getFullYear();
  await expect(page.getByRole("contentinfo")).toHaveText(`© ${year} Sharpening Your Saw`);
});

test("loads the Newsreader and Public Sans fonts", async ({ page }) => {
  const fontStylesheet = page.locator('link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]');
  await expect(fontStylesheet).toHaveAttribute("href", /family=Newsreader/);
  await expect(fontStylesheet).toHaveAttribute("href", /family=Public\+Sans/);
});
