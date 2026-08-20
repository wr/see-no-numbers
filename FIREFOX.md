# Firefox port — how to submit to addons.mozilla.org (AMO)

## What is different from Chrome

- `manifest.firefox.json` replaces `manifest.json` in the Firefox build.
  - Firefox does not run MV3 service workers, so the background script runs as
    an event page (`background.scripts`).
  - Firefox requires an extension ID: `see-no-numbers@wells.ee`.
  - AMO requires a data-collection declaration for all new submissions since
    Nov 2025. This extension declares `"none"` (it collects nothing).
  - Minimum versions: Firefox 140 on desktop, 142 on Android.
- Everything else (all JS, popup, icons) is shared with the Chrome build.

## Build

```
./build.sh
```

Produces `dist/see-no-numbers-chrome-v<version>.zip` and
`dist/see-no-numbers-firefox-v<version>.zip`.

## Test locally

1. Open `about:debugging#/runtime/this-firefox` in Firefox
2. Click "Load Temporary Add-on…" and pick `dist/firefox/manifest.json`
3. Visit any site, open the popup, turn on "Enable on this site"

## Submit

1. Go to https://addons.mozilla.org/developers/ and sign in (or create a free
   Mozilla account)
2. Click "Submit a New Add-on" → "On this site" (listed)
3. Upload `dist/see-no-numbers-firefox-v1.0.69.zip`
4. When asked about source code, answer **No** — the zip contains plain,
   unminified source
5. Fill the listing (copy below)
6. Submit. New extensions get a human review; approval usually takes a few
   days.

## Listing copy

- **Name:** See No Numbers
- **Summary (250 chars max):** Hide numbers on any website. Digits and
  spelled-out numbers become bullets, per site, with one click or a keyboard
  shortcut. Dates and times stay readable. Nothing leaves your browser.
- **Description:** See No Numbers masks numbers on websites you choose. Turn
  it on per site from the toolbar popup, or with Alt+Shift+N. Digits, numbers
  with suffixes (1.2K, 3M), and spelled-out numbers (twenty, hundred) become
  bullet characters. Dates, times, and years are detected and left alone. An
  optional "hide magnitude" mode replaces every number with exactly three
  bullets so lengths give nothing away. Numbers drawn into canvas charts are
  masked too. All settings are stored locally; the extension collects no data
  and talks to no servers.
- **Categories:** Privacy & Security (or Other)
- **License:** GPL-3.0 (matches the LICENSE file)
- **Privacy policy:** paste the contents of PRIVACY.md
- **Support site:** the GitHub repo URL
- **Screenshots:** at least one is required — a before/after of a page with
  masked numbers works well. Reuse the Chrome Web Store screenshots.

## Data collection question in the submission flow

AMO asks about data collection during submission. The manifest already
declares "none"; answer the form the same way: no data collected or
transmitted.
