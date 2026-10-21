# Build the Whetstone static site: implementation plan

Spec: [`docs/specs/2026-10-20-21:02:03-whetstone-static-site-design.md`](../specs/2026-10-20-21:02:03-whetstone-static-site-design.md)
Mockup: https://claude.ai/artifact/NbV9NzVEe6rBK3d4MPBnTA (option A)

## How this plan runs

- **One task at a time.** Each task gets three passes:
  1. **Implementer:** writes the failing test first, then the code, then commits.
  2. **Reviewer:** reads the task's diff against the spec and this plan. It reports what it checked and what it found, never just "looks good".
  3. **Fixer:** addresses the review findings, then re-runs every test.
- **Smoke tests:** the user waived per-task manual checks on 2026-10-20 and will review at the end. Claude walks each smoke test itself in the built-in browser and records what it saw. Tasks run back to back without pausing, except where only the user can supply something: the Google Form (Task 7) and the domain (Task 10).
- **Commits** are signed with the Claude Code identity, using semantic messages (`feat:`, `chore:`, `bug:`) and no trailers:
  ```
  git -c user.name="Claude Code" -c user.email="ai@strunk.me" \
      -c user.signingkey="BE7DD937E0BF036EF04EB76F7D4DA0F46A60A0CD" -c commit.gpgsign=true \
      commit -m "feat: ..."
  ```
- **Branching:** work is committed to the local `main` until Task 9, which creates the GitHub repo. Nothing is pushed before then.
- **Commands run through Docker Compose.** No Ruby or Node tooling is installed on the host.
- **Verification steps report evidence.** They say what was read or run and what it returned.

## File map (end state)

```
.
├── _config.yml               # site settings, google_form action + entry IDs
├── Gemfile                   # github-pages 232
├── docker-compose.yml        # jekyll, e2e, unit services
├── _layouts/default.html
├── _includes/header.html
├── _includes/footer.html
├── index.md                  # Home copy
├── contact.html              # Contact page + form
├── assets/site.css
├── assets/contact.js
├── apps-script/notify.gs     # pasted into the Google Form's script editor
├── tests/e2e/*.spec.js       # Playwright
├── tests/unit/notify.test.js # node --test
├── package.json              # pins @playwright/test only
├── README.md                 # run, test, edit, Google setup
└── docs/{specs,plans}/
```

---

## Task 1: Scaffold Jekyll and the test harness

**Goal:** the site builds and serves in Docker, and the Playwright and Node test runners run in Docker.

1. **Look up the versions to pin and record the evidence in the commit body:**
   - `ruby:3.3.4` image. Its version comes from https://pages.github.com/versions/, which listed Ruby 3.3.4 on 2026-10-20. Re-read the page and use whatever it lists now.
   - `@playwright/test` and the matching `mcr.microsoft.com/playwright:v<version>-noble` image. Read the npm registry (`npm view @playwright/test time --json` inside a `node` container) and pick the newest release that is at least two weeks old.
2. **Write the files:**
   - `Gemfile`: `gem "github-pages", "232", group: :jekyll_plugins`.
   - `_config.yml`: title, description, `baseurl: ""`, and an `exclude` list (`docs`, `tests`, `apps-script`, `node_modules`, `package*.json`, `docker-compose.yml`, `README.md`).
   - `docker-compose.yml` with three services:
     - `jekyll` runs `bundle exec jekyll serve --host 0.0.0.0 --livereload` on port 4000, with a bundle cache volume.
     - `e2e` uses the Playwright image, depends on `jekyll`, and uses `BASE_URL=http://jekyll:4000`.
     - `unit` uses the same image and runs `node --test tests/unit`.
   - `package.json` and `playwright.config.js`: Chromium only, `baseURL` from the environment.
   - `.gitignore`: `_site/`, `.jekyll-cache/`, `node_modules/`, `.bundle/`, `vendor/`.
3. **Red:** write `tests/e2e/smoke.spec.js`, which asserts that `GET /` returns 200 and the page title contains "Sharpening Your Saw". Run `docker compose run --rm e2e`. It should fail because there is no `index.md` yet.
4. **Green:** add a placeholder `index.md` with front matter only, and re-run. If Jekyll or Bundler fails to start, record the exact error and the fix in the commit body.
5. **Commit:** `chore: scaffold jekyll site and docker test harness`.

**Smoke test (user):**
1. Run `docker compose up jekyll`.
2. Open http://localhost:4000/.
3. Expect a blank page with the tab title "Sharpening Your Saw". The terminal should show no errors.

## Task 2: Shared layout and Home page

**Goal:** the Home page matches mockup A at desktop width.

1. **Red:** `tests/e2e/home.spec.js` asserts that:
   - The `<title>` is "Sharpening Your Saw", and the meta description is the lead sentence.
   - The header has the wordmark linking to `/`, and the nav has Home and Contact. Home has `aria-current="page"`.
   - The eyebrow, headline (with `<em>sustainable</em>`), lead sentence, all four services in order, and the "Start a conversation" link to `/contact/` are present.
   - The footer reads `© <current year> Sharpening Your Saw`.
   - The Newsreader and Public Sans stylesheet link is present.
2. **Green:**
   - Write `_layouts/default.html`, `_includes/header.html` and `_includes/footer.html`. Mark the current link with `page.url`, and pass every link through `relative_url` so Task 9's temporary `baseurl` works.
   - Write `index.md`, keeping the copy in front matter and Markdown.
   - Write `assets/site.css` with the spec's tokens as CSS custom properties. Port the mockup's `.a` rules, minus the mockup-only chrome.
3. **Commit:** `feat: add whetstone layout and home page`.

**Smoke test (user):**
1. Open http://localhost:4000/ at full desktop width.
2. Check:
   - The italic wordmark is top-left, and HOME / CONTACT are top-right with HOME underlined in steel blue.
   - The large serif headline has "sustainable" in italic blue, with the two-tone bar below it.
   - The lead sentence is followed by four services in a row under a hairline.
3. Click **Start a conversation →**. It should go to `/contact/`, which is a 404 for now; that's expected.
4. Click the wordmark to return home.

## Task 3: Contact page and form markup (no JavaScript yet)

**Goal:** the Contact page renders the form, and a plain HTML post targets the Google Form.

1. **Red:** `tests/e2e/contact.spec.js` asserts that:
   - The `<title>` is "Contact · Sharpening Your Saw", and Contact has `aria-current="page"`.
   - The heading "Contact" and the line "Send a message and we'll get back to you." are present.
   - The form has `method=post` and `action` equals `site.google_form.action`.
   - Name, Email, Subject and Message each have a visible `<label>`, and their `name`s equal the configured `entry.*` values.
   - Name, Email and Message are `required`; Email is `type=email`.
   - The honeypot input exists, has no `entry.` name, has `tabindex=-1` and `autocomplete=off`, isn't visible (`toBeHidden` or a zero-size bounding box), and is `aria-hidden`.
2. **Green:**
   - Add to `_config.yml` a `google_form:` block with `action` and `entries.{name,email,subject,message}`. Until Task 8 these are clearly fake values: `https://docs.google.com/forms/d/e/REPLACE_ME/formResponse` and `entry.1000000001`–`entry.1000000004`, with a comment pointing at Task 8.
   - Write `contact.html`, and port the mockup's form styles into `site.css`.
3. **Commit:** `feat: add contact page and form markup`.

**Smoke test (user):**
1. Open http://localhost:4000/contact/.
2. Check:
   - The "Contact" heading and line are on the left, and the form is on the right.
   - The labels are small uppercase, and the CONTACT nav link is underlined.
   - Tabbing from Name goes Email → Subject → Message → Send, and never lands on a hidden field.
3. Don't submit yet; the action is a placeholder.

## Task 4: Phone layout for both pages

**Goal:** below 640px wide, the pages match the mockup's phone view.

1. **Red:** `tests/e2e/responsive.spec.js` runs at a 390×844 viewport for `/` and `/contact/`. It asserts that:
   - `document.documentElement.scrollWidth <= 390`, so there's no horizontal scroll.
   - The four services sit in two columns: items 1 and 2 share a `top` and items 3 and 4 share a lower `top`.
   - The contact intro sits above the form (the form's `top` is greater than the intro's `bottom`).
   - Name and Email are stacked.
   - The headline's computed font size is 44px.
2. **Green:** add the `@media (max-width: 640px)` rules from the mockup's container query.
3. **Commit:** `feat: add phone layout`.

**Smoke test (user):**
1. Open http://localhost:4000/ and http://localhost:4000/contact/ in a narrow window, or use dev tools' device mode at iPhone width.
2. Check:
   - There's no sideways scrolling, and the gutters are 20px.
   - The services show as a 2×2 grid, and the contact form sits below the heading in one column.
   - The header wraps cleanly if the wordmark and nav don't fit on one line.

## Task 5: Contact form behavior (JavaScript)

**Goal:** submitting runs validation, the honeypot, the `no-cors` POST and the three states, all without touching Google.

1. **Red:** `tests/e2e/contact-form.spec.js` intercepts `**/formResponse` with `page.route` and records the request body. Before any assertion depends on it, confirm in this step that the route handler is actually hit for a `mode: "no-cors"` fetch, and record that result. Cases:
   - **Validation:** submitting empty sends no request, and the browser's validity state flags Name, Email and Message.
   - **Body:** with all fields filled, one POST with `application/x-www-form-urlencoded` contains exactly the four configured `entry.*` keys with the typed values.
   - **Sending:** while the route is held open, the button is disabled and reads "Sending…".
   - **Success:** the route fulfills with 200, the form is replaced by "Thanks. Your message is on its way.", and that element has focus.
   - **Error:** the route aborts (`route.abort("failed")`), the error message shows, the fields keep their values, and the button is enabled again.
   - **Honeypot:** with the honeypot filled through `page.evaluate`, success shows and no request is sent.
   - **No-JS fallback:** with JavaScript disabled in that test's context, the form's native submission targets the configured action. Assert on the navigation request, intercepted and fulfilled locally.
2. **Green:** write `assets/contact.js`, loaded with `defer` on the Contact page only, and add the state styles to `site.css`. Use readable names (`contactForm`, `honeypotInput`, `submitButton`), no abbreviations.
3. **Commit:** `feat: submit contact form to google form`.

**Smoke test (user):**
1. Open http://localhost:4000/contact/.
2. Click **Send message** with everything empty. The browser should flag the required fields.
3. Fill in every field and click **Send message**. The button should briefly read "Sending…", then the form becomes a thank-you message. (The action is still the placeholder, so nothing reaches Google. The `no-cors` request completes against Google's 404 page.)
4. Reload, turn on airplane mode or disconnect from the network, then fill in and send. The error message should show, and your text should still be in the fields.

## Task 6: Notification script

**Goal:** `apps-script/notify.gs` emails each response, with its logic unit-tested in Node.

1. **Red:** `tests/unit/notify.test.js` (`node:test`) loads `notify.gs` through `require` and tests `buildNotification(answers)`, where `answers` is a list of `{ title, response }` pairs:
   - The subject is `Website contact: <Subject>`, or `Website contact: (no subject)` when Subject is blank.
   - `replyTo` is the Email answer.
   - The body lists every title and answer in Form order. A blank answer shows as `(blank)`.
   - A missing Email answer leaves `replyTo` undefined, so `sendEmail` falls back to its default.
2. **Green:** write `notify.gs` with:
   - `buildNotification`, which is pure.
   - `onFormSubmit(e)`, which maps `e.response.getItemResponses()` to `{ title: item.getItem().getTitle(), response: item.getResponse() }`, reads `NOTIFY_EMAIL` from `PropertiesService.getScriptProperties()`, and calls `MailApp.sendEmail(recipient, subject, body, { replyTo })`.
   - The guard `if (typeof module !== "undefined") module.exports = { buildNotification };`.
3. **README:** add a "Google Form setup" section the user follows in Task 7:
   - Create the questions.
   - Link a Sheet.
   - Publish.
   - In the script editor, paste `notify.gs`.
   - In Project Settings → Script Properties, add `NOTIFY_EMAIL`.
   - In Triggers → Add Trigger, choose `onFormSubmit`, event source "From form", event type "On form submit".
   - Authorize.
4. **Commit:** `feat: add form notification script`.

## Task 7: Google Form spike (user and Claude, decision gate)

> 2026-10-20: the user dropped the Subscribe question and shared the Form link. The four `entry.<id>` values and the `curl` result (step 3) are recorded in the spec under Unverified assumptions.

**Goal:** confirm the spec's three unverified assumptions against the real Form before relying on them.

1. The user follows the README setup and sends Claude the **pre-filled link** (More → Pre-fill form → fill every field with recognizable text → Get link) and the Form's public link.
2. Claude reads the `entry.<id>` parameters from the pre-filled link and reports the link with each ID mapped to its question. If the link doesn't contain `entry.<id>` parameters, stop and report what it does contain.
3. **`curl` test:** POST URL-encoded `entry.*` fields (Subject "spike 1") to `.../formResponse`, with no Google cookies. Record the HTTP status and the first lines of the response. The user confirms whether a row appeared in the Sheet and whether the email arrived.
4. **Browser test:** serve the site locally with the real `action` and IDs in a scratch `_config.yml` override, not committed. Submit from a browser profile that isn't signed in to Google, with Subject "spike 2". The user confirms the row and the email.
5. **Decision gate:** if either submission is rejected (for example a sign-in redirect) or doesn't reach the Sheet, stop. Report the evidence and ask the user whether to switch to the Apps Script web app design. Don't continue to Task 8 without their answer.
6. Delete the spike rows from the Sheet (the user does this). Nothing is committed in this task.

## Task 8: Wire up the real Form

1. **Red:** update the Task 3 and Task 5 tests to read the expected action and IDs from `_config.yml` rather than the placeholders (if they already do, there's nothing to change), and add an assertion that `_config.yml` contains no `REPLACE_ME`. Run the tests; they should fail.
2. **Green:** put the real `action` and the `entry.*` IDs from Task 7 in `_config.yml`. Run every e2e and unit test.
3. **Commit:** `feat: connect contact form to google form`.

**Smoke test (user):**
1. Open http://localhost:4000/contact/ in a browser that isn't signed in to Google.
2. Send a message with Subject "local check".
3. Confirm a new Sheet row and an email whose reply-to is the address you typed.
4. Delete the row.

## Task 9: Create the public repo and publish on GitHub Pages

**This step is outward-facing:** confirm with the user before creating the repo.

1. Set `baseurl: "/sharpeningyoursaw-site"` temporarily, so the `github.io` project URL works before the custom domain exists.
2. Run `gh repo create dstrunk/sharpeningyoursaw-site --public --source . --push`.
3. Enable Pages from `main` at `/`. Before running it, read the current GitHub REST docs for the Pages endpoint and record the request used.
4. Wait for the build. Check it with `gh api repos/dstrunk/sharpeningyoursaw-site/pages/builds/latest` and record the status.
5. **Commit (before the push):** `chore: set github pages project baseurl`.

**Smoke test (user):**
1. Open https://dstrunk.github.io/sharpeningyoursaw-site/.
2. Check that the fonts and styles load on both pages and that the nav links stay under `/sharpeningyoursaw-site/`.
3. Send one form submission with Subject "pages check".
4. Confirm the row and email, then delete the row.

## Task 10: Custom domain and DNS

1. The user supplies the domain, the DNS provider, and whether they want the apex, `www`, or both.
2. Read GitHub's current *Managing a custom domain for your GitHub Pages site* docs. Quote the exact records (A/AAAA/CNAME values) in the instructions you give the user. Don't use IP addresses from memory.
3. Set `baseurl: ""`, add a `CNAME` file containing the domain, and set the custom domain on the repo.
4. **Commit:** `chore: add custom domain`. Push.
5. The user updates DNS. Verify with `dig` (record the output), then `curl -I https://<domain>/` (record the status).
6. Enforce HTTPS once GitHub reports the certificate is issued.

**Smoke test (user):**
1. Open `https://<domain>/` and `https://<domain>/contact/`.
2. Check that the padlock shows, `http://` redirects to `https://`, and both pages render.
3. Send a real submission and confirm the Sheet row and the email.

## Task 11: Final review

1. Run a whole-branch code review of every commit since the scaffold, against the spec. It checks:
   - accessibility: labels, focus states, contrast of `#56636d` on `#eceff1`
   - no leftover placeholders
   - no secrets in the repo, especially `NOTIFY_EMAIL`
   - comment hygiene and readable names
2. Fix the findings in their own commits, re-run all tests, and push.
3. The user walks the final checklist below.

---

## Spec coverage self-review

| Spec item | Task(s) |
| --- | --- |
| Whetstone design, tokens, fonts | 2, 3 |
| Home copy and structure | 2 |
| Contact heading, line, fields, required flags | 3 |
| `/contact/` path | 3 |
| Shared header/footer, active link, `site.time` year, titles, meta description | 2, 3 |
| 640px phone layout | 4 |
| Native POST fallback to `formResponse` | 3, 5 |
| JS validation, honeypot, `no-cors` POST | 5 |
| Sending / success / error states | 5 |
| Honeypot not sent to Google | 3, 5 |
| Notification script, Script Property, `replyTo`, subject fallback | 6 |
| Google Form + Sheet + trigger setup instructions | 6 |
| Unverified assumptions 1–2 (sign-in, `formResponse` POST) | 7 |
| Live submission check (and re-check after Form changes, documented in README) | 7, 8, 9, 10 |
| New public repo, Pages from `main`, `github-pages` 232 | 1, 9 |
| Docker-only tooling | 1 |
| Custom domain, HTTPS | 10 |
| WordPress hosting left untouched until live | 10 (no task touches it) |
| Out of scope items | Not implemented |

## Final full-site walkthrough (user)

- [ ] `https://<domain>/` loads over HTTPS with the Whetstone design, both fonts rendering
- [ ] The home copy matches the old site's wording, and all four services are listed
- [ ] "Start a conversation →" opens `/contact/`, and the nav underline follows the current page
- [ ] The footer shows the current year
- [ ] At phone width: no sideways scroll, services 2×2, the form in one column
- [ ] An empty submit flags the required fields
- [ ] A real submission shows the thank-you message, a Sheet row with the right columns, and an email you can reply to that reaches the sender
- [ ] With JavaScript off (optional), the form still posts and lands on Google's confirmation page
- [ ] The repo is public and contains no notification email address or other secrets
- [ ] The README explains how to run the site locally, run the tests, edit the copy, and redo the Google Form IDs
