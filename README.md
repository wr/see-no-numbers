![icon](icons/emoji_on_128.png)

# See No Numbers

Hide numbers on any website. A Chrome extension for people who want to avoid seeing metrics, prices, follower counts, or other anxiety-inducing numbers.

## Features

- **Per-site control** — Enable masking on specific domains via the popup
- **Hide magnitude mode** — Replace all numbers with `•••` to hide their size
- **Keyboard shortcuts** — Quick toggles without opening the popup
- **Global enable/disable** — Master switch to turn off masking everywhere
- **Dark mode** — Popup automatically matches your system theme
- **Date & time preservation** — Intelligently preserves dates and times
- **Canvas support** — Masks numbers rendered in canvas elements (charts, graphs)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+N` | Toggle masking for current site |
| `Alt+Shift+G` | Toggle global enable/disable |

## What Gets Masked

- Numeric digits: `123,456.78` → `•••,•••.••`
- Numbers with suffixes: `10M`, `5.5K` → `••M`, `•.•K`
- Spelled-out numbers: `twenty`, `million` → `••••••`, `•••••••`

## What Gets Preserved

- Dates: `Nov 22, 2025`, `11/22/2025`, `2025-12-15`, `15.12.2025`
- Times: `10:30`, `10:30:45`, `10:30 AM`
- Years: `1900`-`2099`
- Code blocks: `<code>`, `<pre>`, `<script>`, `<style>`

## Install

[Chrome Web Store](https://chromewebstore.google.com/detail/see-no-numbers/fdilkpeadfomoipnkbfadopdcjdjgjdm) · [Releases](https://github.com/wr/see-no-numbers/releases)

## License

GPL-3.0
