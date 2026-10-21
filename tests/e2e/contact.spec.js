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

  for (const label of ["Name", "Email", "Subject (optional)", "Message"]) {
    await expect(page.locator("form.contact-form label", { hasText: new RegExp(`^${label.replace(/[()]/g, "\\$&")}$`) })).toBeVisible();
  }

  await expect(name).toHaveAttribute("name", googleForm.entries.name);
  await expect(email).toHaveAttribute("name", googleForm.entries.email);
  await expect(subject).toHaveAttribute("name", googleForm.entries.subject);
  await expect(message).toHaveAttribute("name", googleForm.entries.message);

  await expect(name).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("required", "");
  await expect(email).toHaveAttribute("type", "email");
  await expect(subject).not.toHaveAttribute("required");
  await expect(message).toHaveAttribute("required", "");
  await expect(message).toHaveJSProperty("tagName", "TEXTAREA");
});

test("hides the honeypot from people and sends it to its own Google Form question", async ({ page }) => {
  const honeypot = page.locator("#contact-leave-blank");
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("autocomplete", "off");
  await expect(honeypot).toHaveAttribute("name", googleForm.entries.honeypot);
  await expect(page.locator(".honeypot")).toHaveAttribute("aria-hidden", "true");

  const box = await honeypot.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x + box.width).toBeLessThanOrEqual(0);

  const submittedNames = await page.locator("form.contact-form [name]").evaluateAll(
    (controls) => controls.map((control) => control.name)
  );
  expect(submittedNames).toEqual(Object.values(googleForm.entries));
});

test("tabs through the fields in order without stopping on the honeypot", async ({ page }) => {
  await page.getByLabel("Name").focus();
  const focusOrder = [];
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press("Tab");
    focusOrder.push(await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim()));
  }
  expect(focusOrder).toEqual(["contact-email", "contact-subject", "contact-message", "Send message"]);
});

test("is configured with a real Google Form", () => {
  expect(googleForm.action).toMatch(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/);
  expect(googleForm.action).not.toContain("REPLACE_ME");
  for (const entryName of Object.values(googleForm.entries)) {
    expect(entryName).not.toMatch(/^entry\.100000000\d$/);
  }
});
