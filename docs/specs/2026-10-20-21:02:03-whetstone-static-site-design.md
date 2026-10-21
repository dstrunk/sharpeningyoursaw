# Sharpening Your Saw static site: design spec

Replaces the WordPress site with a two-page static site on GitHub Pages, using the
approved **A · Whetstone** direction
([mockup](https://claude.ai/artifact/NbV9NzVEe6rBK3d4MPBnTA)).

## Decisions

| Area | Decision | Basis |
| --- | --- | --- |
| Design | A · Whetstone | Chosen by the user from four mockups |
| Repository | New public repo `dstrunk/sharpeningyoursaw-site`; the WordPress repo `dstrunk/sharpeningyoursaw` stays private and unchanged as an archive | The WordPress repo is private, the account is on GitHub Free (`gh api user` → `"plan": {"name": "free"}`), and its history contains `wp-content/wflogs/*` (attack data, IP lists, WAF config). GitHub Docs ([What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)): Pages is available in public repositories with GitHub Free, and in private ones only with Pro, Team or Enterprise |
| Site generator | Jekyll, built by GitHub Pages from the `main` branch | GitHub Pages builds Jekyll itself, so no build workflow is needed. Content stays in Markdown for occasional hand edits |
| Jekyll version | Local builds pin the `github-pages` gem at version **232** (Jekyll **3.10.0**, Ruby **3.3.4**) | Read from https://pages.github.com/versions/ on 2026-10-20 |
| Local development | `docker compose` runs Jekyll (`ruby:3.3` image + `github-pages` gem) and the test runners. Nothing is installed on the host | Project preference for Docker |
| Contact form storage | The site's form posts to a **Google Form's `formResponse` endpoint**, using the Form's `entry.<id>` field names. The Form saves responses to a linked Google Sheet | The user's previous setup; chosen by the user over an Apps Script web app |
| Notification email | An Apps Script bound to the Google Form, run by an installable **form submit** trigger, emails each response's contents | Google's built-in "Get email notifications for new responses" is documented, but the help page doesn't say whether the email includes the answers (see Sources) |
| Mailing list | Dropped: no checkbox, and no Subscribe question in the Form | The user decided on 2026-10-20 that it won't be needed |
| Spam protection | A hidden honeypot field, checked in the browser. When it's filled, the site shows success and sends nothing | The WordPress site used a Contact Form 7 honeypot plugin. Limitation: the honeypot only stops bots that run the page's JavaScript, because the `formResponse` URL is public and can be posted to directly |

## Pages

### Home (`/`)

Content is the existing copy, arranged as in the mockup:

- Eyebrow: "Executive coaching & consulting"
- Headline: "Creating positive, *sustainable* change." (the italic word takes the accent color)
- The two-tone whetstone bar
- Lead: "Sharpening Your Saw provides expertise in leadership development, team building, executive coaching and strategic development."
- Services row: Leadership development · Team building · Executive coaching · Strategic development
- A "Start a conversation →" link to `/contact/`

### Contact (`/contact/`)

- Heading "Contact", and the line "Send a message and we'll get back to you."
- Fields:

  | Field | Site input | Google Form question | Required |
  | --- | --- | --- | --- |
  | Name | text | Short answer "Name" | yes |
  | Email | `type="email"` | Short answer "Email" | yes |
  | Subject | text | Short answer "Subject" | no |
  | Message | textarea | Paragraph "Message" | yes |
  | (honeypot) | off-screen text input labelled "Leave this field blank", `tabindex="-1"`, `autocomplete="off"`, no `name`, so it is never submitted | none | n/a |

  Each input's `name` is the matching question's `entry.<id>`. The IDs go in `_config.yml` once the Form exists.

- The `/contact/` path matches the WordPress default permalink for a page named "Contact". The old site's actual permalink setting has not been checked: it lives in the WordPress database, which is not in the repo.

### Shared layout

- Header: italic wordmark "Sharpening Your Saw" on the left, and Home / Contact nav on the right. The current page's link is underlined.
- Footer: "© {year} Sharpening Your Saw". The year comes from `site.time`, so it updates on the next build after New Year.
- Responsive breakpoints: at 820px and below, services go to two columns and the contact form moves below its intro. At 640px and below (the mockup's phone layout) gutters drop to 20px, the headline to 44px, and Name/Email stack. The 820px step was added after review found the desktop layout cramped between 641 and 820px.
- `<title>` per page ("Sharpening Your Saw" / "Contact · Sharpening Your Saw") and a meta description using the lead sentence.

## Visual tokens (from the mockup)

| Token | Value |
| --- | --- |
| Background | `#eceff1` |
| Ink | `#1c2328` |
| Body text | `#33404a` |
| Muted (also the footer) | `#56636d`. The mockup used `#66727c` for the footer; that is 4.27:1 on the background, below WCAG AA |
| Accent (steel) | `#2e5470` |
| Fine grit | `#a9b8c3` |
| Rules | `#cdd4d9` |
| Input fill / border | `#f8fafb` / `#78868f`. The mockup's `#b7c2ca` border was 1.57:1 on the background, below the 3:1 WCAG asks for field edges |
| Display face | Newsreader (Google Fonts), italic for the wordmark and accent word |
| Text face | Public Sans (Google Fonts) |

The site is single-theme, as the mockup is. It has no dark mode.

## Contact form behavior

1. The `<form>` has `method="post"` and `action="{{ site.google_form.action }}"`, where the action is `https://docs.google.com/forms/d/e/<FORM_ID>/formResponse`. Without JavaScript, a browser form post is a page navigation, so CORS doesn't apply and the visitor lands on Google's own confirmation page.
2. With JavaScript, `assets/contact.js`:
   1. Intercepts the submit and runs the browser's built-in validation (`required`, `type="email"`).
   2. If the honeypot is filled, shows success and stops.
   3. POSTs the `entry.*` fields as `application/x-www-form-urlencoded` with `fetch(action, { method: "POST", mode: "no-cors", body })`.
3. **The site cannot confirm that a submission was saved.** Two community write-ups (below) report that Google does not send CORS headers for `formResponse`, so a `no-cors` request returns an opaque response: "You cannot tell success from failure." Success therefore means the request completed without a network error. A rejected `fetch` (offline, DNS failure) shows the error state.
4. States:
   - **Sending:** the button is disabled and reads "Sending…".
   - **Success:** the form is replaced with "Thanks. Your message is on its way." and focus moves to that message.
   - **Error:** an inline message reads "Your message couldn't be sent. Please try again in a moment." The fields keep their values and the button is enabled again.
5. Because failures are invisible to the site, the plan includes a live check that a real submission reaches the Sheet and triggers the email. That check is repeated whenever the Form's questions change, since changing them can change the `entry.<id>` values.

## Google Form, Sheet and notification script

**Form and Sheet setup** (user, in Google Forms):
- Create the four questions above. The user created the Form on 2026-10-20 (short link `https://forms.gle/CCV4etjSHXKTjAcc9`).
- Link the Sheet via Responses → **Link to Sheets** (Google Forms Help, *View & manage form responses*).
- Publish the Form so anyone can respond. See the sign-in risk under Unverified assumptions.
- Get the `entry.<id>` values with More → **Pre-fill form** → **Get link** (Google Forms Help, *Publish & share your form*). Google's page documents these steps but not the link's URL format. The community write-ups below describe the `entry.<id>` parameters, which the spike confirms.

**Notification script** (`apps-script/notify.gs` in this repo; the user pastes it into the Form's script editor):
- Uses an installable **form submit** trigger on the Form, added in the script editor via Triggers → Add Trigger. Google says to use `FormTriggerBuilder` for this trigger. "Installable triggers always run under the account of the person who created them."
- The handler reads `e.response.getItemResponses()` ("in the same order that the items appear in the form"). For each `ItemResponse` it reads `getItem().getTitle()` and `getResponse()`. For text questions, `getResponse()` returns a `String`.
- Sends `MailApp.sendEmail(recipient, subject, body, { replyTo })`:
  - recipient: the `NOTIFY_EMAIL` Script Property. It stays out of the public repo.
  - `replyTo`: the submitter's Email answer. Google describes `replyTo` as "an email address to use as the default reply-to address".
  - subject: `Website contact: {Subject or "(no subject)"}`
  - body: each question title and its answer.
- Quota: consumer accounts can send email to 100 recipients a day (Apps Script quotas page, read 2026-10-20).
- Testability: the pure function `buildNotification(answers)` sits behind `if (typeof module !== "undefined") module.exports = …`, so Node's test runner can import it. Apps Script ignores that line.

## Unverified assumptions (checked in the plan's first backend task)

1. **Anonymous responses.** Google's *Publish & share your form* help page, as fetched on 2026-10-20, says: "To access and fill out the form, users must sign in to their Google Account." It isn't clear from the fetched text whether that applies to every published form or only to restricted ones. If a `formResponse` POST from a signed-out browser is rejected, this approach fails. The fallback would be the Apps Script web app design, for the user to decide.
2. **`formResponse` accepts a POST from another site** with `entry.<id>` fields, and the response is opaque. This comes only from community sources, not Google documentation.

**Spike:**
1. With the real Form, POST a test submission with `curl` (no CORS involved) and check that a Sheet row appears.
2. POST again with `fetch(..., { mode: "no-cors" })` from the locally served site in a signed-out browser, and check again.
3. Check that the notification email arrives.

**Results so far (2026-10-20):**
- The Form's public page, fetched with `curl` without Google cookies, returned 200. Its `FB_PUBLIC_LOAD_DATA_` script lists four questions: Name `entry.1795760626`, Email `entry.650575490`, Subject `entry.1974149135`, Message `entry.1522122871`. Reading IDs this way relies on an undocumented page structure. The pre-filled link is the documented route.
- Spike step 1: `curl -X POST .../formResponse` with those four fields and no cookies returned HTTP 200, with the page text "Your response has been recorded." This is evidence against assumption 1 for non-browser requests. The Sheet row hasn't been confirmed by the user yet.
- Spike step 2: headless Chromium (Playwright 1.63.0, new context with 0 Google cookies) submitted the locally served `/contact/` with the real config, twice ("spike 2" and "spike 3"). The site showed its thank-you message. Playwright's `response` event reported **HTTP 200** from `formResponse`, and `requestfailed` then reported `net::ERR_ABORTED`. A likely cause is Chromium discarding the opaque response body, but that is an inference. Evidence so far: Google accepts the cross-site, signed-out POST, and assumption 1 doesn't block this approach. The rows in the Sheet still need the user's confirmation.
- Spike step 3, the notification email, waits on the user installing `apps-script/notify.gs`.

## Testing

- **End-to-end (outside-in):** Playwright (`mcr.microsoft.com/playwright` image) runs against the Jekyll container. It covers:
  - rendered copy, navigation and the active link
  - the phone layout at 390px
  - form validation
  - the honeypot short-circuit
  - the request body: `entry.*` names, no honeypot field
  - the sending, success and network-error states

  Requests to `docs.google.com` are intercepted with `page.route`, so tests never post to the real Form.
- **Unit:** `node --test` covers `buildNotification`: subject fallback, reply-to and body layout.
- **Manual / live:**
  - a browser smoke test at the end of each UI task
  - the backend spike above
  - one real submission after launch, confirmed in the Sheet and inbox

## DNS and launch (last)

- The user supplies the domain and DNS access. Adding the domain creates a `CNAME` file and sets the custom domain on the repo. HTTPS is enforced once the certificate is issued.
- The old WordPress hosting is left untouched until the new site is confirmed live.

## Out of scope

Mailchimp sync, analytics, a blog or other WordPress content, redirects for other old WordPress URLs, a favicon, dark mode, and server-side spam filtering.

## Sources (read 2026-10-20)

**Google documentation**
- Apps Script, *Event objects*, https://developers.google.com/apps-script/guides/triggers/events. Forms form-submit event: `response` is "A `FormResponse` object, representing the user's response to the form as a whole". Caution: "use this form submit trigger with `FormTriggerBuilder`".
- Apps Script, *Installable triggers*, https://developers.google.com/apps-script/guides/triggers/installable. The form submit trigger "runs when a user responds to a form". Manual setup is Triggers → Add Trigger. Run-as: quoted above.
- Apps Script, `FormResponse`, https://developers.google.com/apps-script/reference/forms/form-response. Documents `getItemResponses()` and `getTimestamp()`.
- Apps Script, `ItemResponse`, https://developers.google.com/apps-script/reference/forms/item-response. `getResponse()` returns "a `String` or `String[]` or `String[][]`". `CheckboxItem` returns `String[]`.
- Apps Script, `MailApp`, https://developers.google.com/apps-script/reference/mail/mail-app. Documents `sendEmail(recipient, subject, body, options)` and the `replyTo` option.
- Apps Script, *Quotas*, https://developers.google.com/apps-script/guides/services/quotas. Email recipients per day: "100 / day" for consumer accounts.
- Google Forms Help, *View & manage form responses*, https://support.google.com/docs/answer/139706. Covers "Get email notifications for new responses" and "Link to Sheets". It does not say what the notification email contains.
- Google Forms Help, *Choose where to save form responses*, https://support.google.com/docs/answer/2917686. Covers a new or existing spreadsheet as the destination. It does not describe the column layout.
- Google Forms Help, *Publish & share your form with responders*, https://support.google.com/docs/answer/2839588. Covers the Publish button, General access, the sign-in sentence quoted above, and the Pre-fill form → Get link steps.

**Community sources (Google does not document posting to `formResponse` from other sites)**
- Atomic Object, *Embedding Google Forms in a Static Website Without iFrames* (2021-05-20), https://spin.atomicobject.com/embedding-google-forms/. Covers the endpoint form `https://docs.google.com/forms/.../formResponse`, `entry.<id>` names found in network traffic (`_sentinel` fields can be ignored), the CORS rejection on reading the response, and checkbox/radio values that must match the Form's option text.
- Mathias Ahlgren, *How to Replace a Google Form With a Real HTML Form on Your Site* (dev.to, "Jul 29", year not shown), https://dev.to/mathiasahlgren/how-to-replace-a-google-form-with-a-real-html-form-on-your-site-5hh4. Covers `action="https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse"`, "Google does not send CORS headers for this endpoint", `mode: "no-cors"` → opaque response, and "You cannot tell success from failure."
