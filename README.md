# Sharpening Your Saw

Static site for sharpeningyoursaw, built with Jekyll and published by GitHub Pages from `main`.

## Run locally

```bash
docker compose up jekyll
```

Then open http://localhost:4000/.

## Test

```bash
docker compose run --rm e2e
```

```bash
docker compose run --rm unit
```

## Edit the copy

- Home: `index.md`. The headline, eyebrow, services and link text are in the front matter; the lead sentence is the Markdown body.
- Contact: `contact.html`.
- Colors and type: the custom properties at the top of `assets/site.css`.

## Contact form

The form on `/contact/` posts to a Google Form, which saves each response to a linked Google Sheet. Google sends no CORS headers for that endpoint, so the site can't tell whether a submission was saved. After any change to the Form or to `_config.yml`, send a real test message and check the Sheet.

`_config.yml` holds the Form's `formResponse` URL and the `entry.<id>` for each question. To find the IDs, open the Form and choose More → **Pre-fill form**, fill every field with recognizable text, then click **Get link**. Each `entry.<number>=<your text>` in that link is a question's ID. Editing or recreating a question can change its ID.

### Email notifications

`apps-script/notify.gs` emails each response to you, with the visitor as the reply-to address. To install it:

1. Open the Form and choose More → **Apps Script**.
2. Replace the editor's contents with `apps-script/notify.gs` and save.
3. Click **Project Settings**. Make sure **Enable Chrome V8 runtime** is checked.
4. Under **Script Properties**, click **Add script property**. Enter `NOTIFY_EMAIL` as the property and your address as the value, then click **Save script properties**. The address stays out of this public repo.
5. Click **Triggers**, then **Add Trigger**. Choose the `onFormSubmit` function and the Form's form-submit event, and save.
6. Approve the permissions Google asks for. The trigger runs as your account.

Free Google accounts can email up to 100 recipients a day.
