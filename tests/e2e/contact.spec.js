const { test, expect } = require("@playwright/test");
const { readGoogleFormConfig } = require("./google-form-config");

const googleForm = readGoogleFormConfig();

test.beforeEach(async ({ page }) => {
  await page.goto("/contact/");
});

test("has the contact title and marks Contact as the current page", async ({ page }) => {
  await expect(page).toHaveTitle("Contact · Sharpening Your Saw");
  const navigation = page.getByRole("banner").getByRole("navigation");
  await expect(navigation.getByRole("link", { name: "Contact" })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
});

test("shows the heading and prompt", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact");
  await expect(page.getByText("Send a message and we'll get back to you.")).toBeVisible();
});

test("posts to the Google Form", async ({ page }) => {
  const form = page.locator("form.contact-form");
  await expect(form).toHaveAttribute("method", "post");
  await expect(form).toHaveAttribute("action", googleForm.action);
});

test("names each field after its Google Form question", async ({ page }) => {
  const name = page.getByLabel("Name");
  const email = page.getByLabel("Email");
  const subject = page.getByLabel("Subject");
  const message = page.getByLabel("Message");
  const subscribe = page.getByLabel("Subscribe to the mailing list");

  await expect(name).toHaveAttribute("name", googleForm.entries.name);
  await expect(email).toHaveAttribute("name", googleForm.entries.email);
  await expect(subject).toHaveAttribute("name", googleForm.entries.subject);
  await expect(message).toHaveAttribute("name", googleForm.entries.message);
  await expect(subscribe).toHaveAttribute("name", googleForm.entries.subscribe);

  await expect(name).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("type", "email");
  await expect(subject).not.toHaveAttribute("required");
  await expect(message).toHaveAttribute("required", "");
  await expect(message).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(subscribe).toHaveAttribute("type", "checkbox");
  await expect(subscribe).toHaveAttribute("value", "TRUE");
});

test("hides the honeypot from people and keeps it out of the Google Form", async ({ page }) => {
  const honeypot = page.locator('input[name="website"]');
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("autocomplete", "off");
  await expect(page.locator(".honeypot")).toHaveAttribute("aria-hidden", "true");

  const box = await honeypot.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(0);

  const postedNames = await page.locator("form.contact-form [name]").evaluateAll(
    (controls) => controls.map((control) => control.name)
  );
  expect(postedNames.filter((name) => name !== "website").every((name) => name.startsWith("entry."))).toBe(true);
});

test("tabs through the fields in order without stopping on the honeypot", async ({ page }) => {
  await page.getByLabel("Name").focus();
  const focusOrder = [];
  for (let step = 0; step < 5; step++) {
    await page.keyboard.press("Tab");
    focusOrder.push(await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim()));
  }
  expect(focusOrder).toEqual(["contact-email", "contact-subject", "contact-message", "contact-subscribe", "Send message"]);
});
