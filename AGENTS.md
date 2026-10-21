# AGENTS.md

Maintenance notes for the Sharpening Your Saw site. It has two pages, Home and Contact, built with Jekyll and served by GitHub Pages at https://sharpeningyoursaw.com/.

## Publishing

- Pushing to `main` publishes the site. GitHub Pages builds it with its own Jekyll; there is no workflow file.
- `Gemfile` pins the `github-pages` gem so local builds match what Pages runs.
- Before changing Jekyll features or plugins, check https://pages.github.com/versions/: Pages supports only the plugins listed there.
- Keep the `CNAME` file. It holds the custom domain, and deleting it unpublishes the site from `sharpeningyoursaw.com`.

## Commands

Use Docker; don't install Ruby or Node on the host.

```bash
docker compose up jekyll        # serve at http://localhost:4000/
docker compose run --rm e2e     # Playwright tests (starts Jekyll if needed)
docker compose run --rm unit    # node --test for apps-script/
docker compose down             # stop the Jekyll container afterwards
```

Run both test suites before pushing. Local serving always uses `--baseurl ''`, so the tests expect paths at `/`.

## Where things live

| What | File |
| --- | --- |
| Home copy: eyebrow, headline, services, link text | `index.md` front matter |
| Home lead sentence | `index.md` body |
| Contact page and form | `contact.html` |
| Site title, default meta description, Google Form settings | `_config.yml` |
| Colors, type, layout, breakpoints (820px and 640px) | `assets/site.css`, with tokens at the top |
| Form submit behavior | `assets/contact.js` |
| Email notification script | `apps-script/notify.gs` |

## Contact form

The form posts to a Google Form's `formResponse` URL, using each question's `entry.<id>` as the field name. The Form saves responses to a linked Google Sheet.

- **Failures are silent.** Google sends no CORS headers, so the site's `no-cors` fetch can't see whether a response was saved. A wrong ID drops messages without any error.
- **After any change** to the Form's questions or to `google_form` in `_config.yml`, send a real test message and check that a row appears in the Sheet. Editing or recreating a question can change its ID.
- **Getting the IDs:** in the Form, choose More → Pre-fill form, fill every field, then Get link. Each `entry.<number>` in the link is a question ID. For the action URL, take the responder link and replace `viewform` with `formResponse`.
- **Spam: honeypot.** The page has a hidden, off-screen input that belongs to its own optional Form question, "Leave this blank" (`google_form.entries.honeypot`). It stops bots in two ways:
  - Bots that run the page's JavaScript and fill the field get a fake success from `contact.js`, and nothing is sent.
  - Bots that post straight to `formResponse` usually fill every field, so their responses arrive with the honeypot answered. The notification script skips those.
- **Spam: email filter.** `spamReason()` in `apps-script/notify.gs` also skips the email when the name or message is missing, or when the message has 2 or more links (`LINK_LIMIT`). Filtered responses still land in the Sheet, so check it now and then for real messages that were caught. The script logs each skip to the Apps Script dashboard's logs.
- **Constraint:** keep the field set and the Form's questions in step. The notification script finds answers by the exact question titles "Name", "Email", "Subject", "Message" and "Leave this blank". The honeypot question must stay optional, because people always leave it empty and Google enforces required questions.

## Email notifications

`apps-script/notify.gs` is pasted into the Form's Apps Script editor (More → Apps Script). It runs from an installable form-submit trigger that calls `onFormSubmit`. It reads the recipient from the `NOTIFY_EMAIL` Script Property, which keeps the address out of this public repo, and sets the visitor's email as reply-to. When you change this file, the user has to paste it into the editor again; the repo copy doesn't deploy itself. Check Google's current Apps Script docs for the editor's steps rather than relying on memory.

## Domain and DNS

- DNS is hosted at Porkbun:
  - apex: GitHub Pages' four A and four AAAA records;
  - `www`: a CNAME to `dstrunk.github.io`;
  - email: Porkbun forwarding MX records and an SPF TXT record.
- Leave the `_github-pages-challenge-dstrunk` TXT record in place. It keeps the domain verified on GitHub, which blocks takeover.
- Don't add wildcard records.

## Conventions

- Commit messages are lowercase `type: imperative description`. The types are `feat`, `chore` and `bug` (not `fix`). The body stays empty unless it explains something non-obvious.
- Prefer readable names over abbreviations. Comments explain why, not how.
- Keep the site plain: no frameworks, no build step beyond Jekyll, and no features until they're needed.
