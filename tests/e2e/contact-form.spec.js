const { test, expect } = require("@playwright/test");
const { readGoogleFormConfig } = require("./google-form-config");

const googleForm = readGoogleFormConfig();
const THANKS = "Thanks. Your message is on its way.";
const ERROR = "Your message couldn't be sent. Please try again in a moment.";

const visitor = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Coaching for my team",
  message: "We'd like to talk about leadership development.",
};

async function interceptGoogleForm(page, respond = (route) => route.fulfill({ status: 200, body: "" })) {
  const requests = [];
  await page.route("**/formResponse", async (route) => {
    requests.push(route.request());
    await respond(route);
  });
  return requests;
}

async function fillContactForm(page) {
  await page.getByLabel("Name").fill(visitor.name);
  await page.getByLabel("Email").fill(visitor.email);
  await page.getByLabel("Subject").fill(visitor.subject);
  await page.getByLabel("Message").fill(visitor.message);
}

const sendButton = (page) => page.getByRole("button", { name: /Send message|Sending…/ });

test.describe("with JavaScript", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact/");
  });

  test("does not send when required fields are empty", async ({ page }) => {
    const requests = await interceptGoogleForm(page);
    await sendButton(page).click();

    for (const label of ["Name", "Email", "Message"]) {
      expect(await page.getByLabel(label).evaluate((field) => field.validity.valid)).toBe(false);
    }
    await expect(page.locator("form.contact-form")).toBeVisible();
    await expect(sendButton(page)).toHaveText("Send message");
    expect(requests).toHaveLength(0);
  });

  test("posts the four answers to the Google Form with fetch", async ({ page }) => {
    const requests = await interceptGoogleForm(page);
    await fillContactForm(page);
    await sendButton(page).click();
    await expect(page.getByText(THANKS)).toBeVisible();

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.method()).toBe("POST");
    expect(request.url()).toBe(googleForm.action);
    expect(request.resourceType()).toBe("fetch");
    expect(request.headers()["content-type"]).toContain("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(request.postData()))).toEqual({
      [googleForm.entries.name]: visitor.name,
      [googleForm.entries.email]: visitor.email,
      [googleForm.entries.subject]: visitor.subject,
      [googleForm.entries.message]: visitor.message,
    });
  });

  test("shows a sending state while the request is in flight", async ({ page }) => {
    let releaseRequest;
    const requestReleased = new Promise((resolve) => { releaseRequest = resolve; });
    await interceptGoogleForm(page, async (route) => {
      await requestReleased;
      await route.fulfill({ status: 200, body: "" });
    });

    await fillContactForm(page);
    await sendButton(page).click();
    await expect(sendButton(page)).toHaveText("Sending…");
    await expect(sendButton(page)).toBeDisabled();

    releaseRequest();
    await expect(page.getByText(THANKS)).toBeVisible();
  });

  test("replaces the form with a focused thank-you message", async ({ page }) => {
    await interceptGoogleForm(page);
    await fillContactForm(page);
    await sendButton(page).click();

    await expect(page.getByText(THANKS)).toBeFocused();
    await expect(page.locator("form.contact-form")).toHaveCount(0);
  });

  test("keeps the answers and explains the failure when the request fails", async ({ page }) => {
    await interceptGoogleForm(page, (route) => route.abort("failed"));
    await fillContactForm(page);
    await sendButton(page).click();

    await expect(page.getByRole("alert")).toHaveText(ERROR);
    await expect(page.getByLabel("Name")).toHaveValue(visitor.name);
    await expect(page.getByLabel("Message")).toHaveValue(visitor.message);
    await expect(sendButton(page)).toHaveText("Send message");
    await expect(sendButton(page)).toBeEnabled();
    await expect(sendButton(page)).toBeFocused();
  });

  test("clears the earlier error while a retry is sending", async ({ page }) => {
    let shouldFail = true;
    let releaseRetry;
    const retryReleased = new Promise((resolve) => { releaseRetry = resolve; });
    await interceptGoogleForm(page, async (route) => {
      if (shouldFail) return route.abort("failed");
      await retryReleased;
      return route.fulfill({ status: 200, body: "" });
    });
    await fillContactForm(page);
    await sendButton(page).click();
    await expect(page.getByRole("alert")).toHaveText(ERROR);

    shouldFail = false;
    await sendButton(page).click();
    await expect(sendButton(page)).toHaveText("Sending…");
    await expect(page.getByText(ERROR)).toHaveCount(0);

    releaseRetry();
    await expect(page.getByText(THANKS)).toBeVisible();
  });

  test("pretends to succeed and sends nothing when the honeypot is filled", async ({ page }) => {
    const requests = await interceptGoogleForm(page);
    await fillContactForm(page);
    await page.locator("#contact-leave-blank").evaluate((honeypot) => { honeypot.value = "https://spam.example"; });
    await sendButton(page).click();

    await expect(page.getByText(THANKS)).toBeVisible();
    expect(requests).toHaveLength(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("submits the form natively to the Google Form", async ({ page }) => {
    const requests = await interceptGoogleForm(page, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>Your response has been recorded.</p>" })
    );
    await page.goto("/contact/");
    await fillContactForm(page);
    await sendButton(page).click();

    await expect(page.getByText("Your response has been recorded.")).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(requests[0].resourceType()).toBe("document");
    expect(requests[0].url()).toBe(googleForm.action);
    const postedKeys = Object.keys(Object.fromEntries(new URLSearchParams(requests[0].postData())));
    expect(postedKeys.sort()).toEqual(Object.values(googleForm.entries).sort());
  });
});
