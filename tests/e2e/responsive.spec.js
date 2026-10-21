const { test, expect } = require("@playwright/test");

async function expectNoHorizontalScroll(page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize().width);
}

async function serviceBoxes(page) {
  return page.getByRole("list", { name: "Services" }).getByRole("listitem").evaluateAll(
    (items) => items.map((item) => item.getBoundingClientRect().toJSON())
  );
}

async function expectFormBelowIntro(page) {
  const introBox = await page.locator(".contact-intro").boundingBox();
  const formBox = await page.locator("form.contact-form").boundingBox();
  expect(formBox.y).toBeGreaterThanOrEqual(introBox.y + introBox.height);
}

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home fits a phone and shows services in two columns", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalScroll(page);

    const headlineFontSize = await page.getByRole("heading", { level: 1 }).evaluate((headline) => getComputedStyle(headline).fontSize);
    expect(headlineFontSize).toBe("44px");

    const boxes = await serviceBoxes(page);
    expect(boxes[0].top).toBe(boxes[1].top);
    expect(boxes[2].top).toBe(boxes[3].top);
    expect(boxes[2].top).toBeGreaterThan(boxes[0].top);
    expect(boxes[1].left).toBeGreaterThan(boxes[0].left);
  });

  test("contact fits a phone with the form in one column below the intro", async ({ page }) => {
    await page.goto("/contact/");
    await expectNoHorizontalScroll(page);
    await expectFormBelowIntro(page);

    const nameBox = await page.getByLabel("Name").boundingBox();
    const emailBox = await page.getByLabel("Email").boundingBox();
    expect(emailBox.y).toBeGreaterThan(nameBox.y + nameBox.height);
  });

  test("pages use a 20px side gutter", async ({ page }) => {
    await page.goto("/");
    const gutter = await page.locator(".site-main .inner").evaluate((inner) => getComputedStyle(inner).paddingLeft);
    expect(gutter).toBe("20px");
  });
});

test.describe("between phone and desktop", () => {
  test.use({ viewport: { width: 700, height: 900 } });

  test("services wrap to two columns and the contact form stacks", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalScroll(page);
    const boxes = await serviceBoxes(page);
    expect(boxes[2].top).toBeGreaterThan(boxes[0].top);

    await page.goto("/contact/");
    await expectNoHorizontalScroll(page);
    await expectFormBelowIntro(page);
  });
});

test.describe("at desktop width", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("home shows the four services in one row", async ({ page }) => {
    await page.goto("/");
    await expectNoHorizontalScroll(page);
    const boxes = await serviceBoxes(page);
    expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
  });

  test("contact puts the form beside the intro", async ({ page }) => {
    await page.goto("/contact/");
    const introBox = await page.locator(".contact-intro").boundingBox();
    const formBox = await page.locator("form.contact-form").boundingBox();
    expect(formBox.x).toBeGreaterThan(introBox.x + introBox.width);
  });
});
