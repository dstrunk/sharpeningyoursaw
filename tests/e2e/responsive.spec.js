const { test, expect } = require("@playwright/test");

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoHorizontalScroll(page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
}

test("home fits a phone and shows services in two columns", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalScroll(page);

  const headlineFontSize = await page.getByRole("heading", { level: 1 }).evaluate((headline) => getComputedStyle(headline).fontSize);
  expect(headlineFontSize).toBe("44px");

  const serviceBoxes = await page.getByRole("list", { name: "Services" }).getByRole("listitem").evaluateAll(
    (items) => items.map((item) => item.getBoundingClientRect().toJSON())
  );
  expect(serviceBoxes[0].top).toBe(serviceBoxes[1].top);
  expect(serviceBoxes[2].top).toBe(serviceBoxes[3].top);
  expect(serviceBoxes[2].top).toBeGreaterThan(serviceBoxes[0].top);
  expect(serviceBoxes[1].left).toBeGreaterThan(serviceBoxes[0].left);
});

test("contact fits a phone with the form in one column below the intro", async ({ page }) => {
  await page.goto("/contact/");
  await expectNoHorizontalScroll(page);

  const introBox = await page.locator(".contact-intro").boundingBox();
  const formBox = await page.locator("form.contact-form").boundingBox();
  expect(formBox.y).toBeGreaterThanOrEqual(introBox.y + introBox.height);

  const nameBox = await page.getByLabel("Name").boundingBox();
  const emailBox = await page.getByLabel("Email").boundingBox();
  expect(emailBox.y).toBeGreaterThan(nameBox.y + nameBox.height);
});

test("pages use a 20px side gutter", async ({ page }) => {
  await page.goto("/");
  const gutter = await page.locator(".site-main .inner").evaluate((inner) => getComputedStyle(inner).paddingLeft);
  expect(gutter).toBe("20px");
});
