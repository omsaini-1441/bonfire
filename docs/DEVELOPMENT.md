# Bonfire for developers

No bundler, no TypeScript, no package.json. Chrome loads the files as written. Manifest V3.

User-facing install and demo steps: [../README.md](../README.md).

## How to run while developing

1. Load unpacked (folder that contains `manifest.json`).
2. After every edit: **Reload** the extension, then refresh the tab under test.
3. Keep the demo server running:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve-demo.ps1
```

Open `http://127.0.0.1:8765/trap-page.html`.

### Debug surfaces

| Surface | Where to look |
| --- | --- |
| Content script, scanner, badge | Page → DevTools → Console / Elements → `#bonfire-root` (open shadow) |
| Service worker | `chrome://extensions` → Bonfire → **Inspect views: service worker** |
| Popup | Right-click the popup → Inspect |
| Options | Options tab DevTools |
| Storage | Application → Extension storage, or `chrome.storage` in the service worker console |

`chrome://` and the Web Store never get the content script. Use a normal http(s) page.

## Layout

```
extent/
  manifest.json          Chrome MV3 entry
  README.md              Users: what it is, how to run
  docs/                  This file, user guide, privacy
  demo/trap-page.html    Fake storefront for manual tests
  LICENSE                MIT
  SECURITY.md
  docs/                  User guide, privacy, terms, development
  icons/                 16 / 32 / 48 / 128 PNG
  scripts/generate-icons.ps1
  src/
    scanner.js           Pure scan + clipboard sanitize (no Chrome APIs)
    content.js           Injects badge, copy listener, messages
    content.css          Shadow-DOM styles for the badge
    background.js        Toolbar badge + last-5 hosts
    popup.html/.css/.js
    options.html/.css/.js
    legal.html           In-extension privacy & terms
    theme.css
```

## Data flow

```
page DOM
  → scanner.js  BonfireScanner.scan(document, location, settings)
  → content.js  lastResult + on-page UI
  → runtime message  { type: "bonfire:result", result }
  → background.js  toolbar badge + chrome.storage.local history
  → popup.js  asks the tab for lastResult, background for history
```

Copy path:

```
copy event (capture)
  → BonfireScanner.sanitizeCopied(selection, hiddenSample)
  → clipboard text/plain
  → toast + { type: "bonfire:stripped" }
```

## Message contract

All messages are `{ type: string, ... }`.

| Type | Direction | Payload / reply |
| --- | --- | --- |
| `bonfire:result` | content → background | `{ result }` scan object |
| `bonfire:stripped` | content → background | none; increments counter |
| `bonfire:history` | popup → background | replies with up to 5 `{ host, score, count, scannedAt }` |
| `bonfire:clear-history` | options → background | wipes recent hosts and copy-guard count |
| `bonfire:get` | popup → content | replies with `lastResult` or `undefined` |
| `bonfire:rescan` | popup → content | re-runs scan, replies with new result |
| `bonfire:toggle` | background or popup → content | toggles the on-page panel |

Content scripts ignore missing receivers (`.catch(() => {})`) so a reload mid-scan does not throw.

## Scan result shape

`BonfireScanner.scan` returns:

```js
{
  url, host, scannedAt,
  score,          // 0–100
  label,          // Looks fine | Be careful | Lots of traps | Danger
  findings: [{ id, severity, title, detail }],
  hiddenSample: string[],   // hidden chunks, injection hits first
  stats: { hiddenChunks, extraChars, urgencyHits }
}
```

`severity` is `critical | high | medium | low`. Weights live at the bottom of `scan()` in `scanner.js`.

Finding `id`s: `prompt_injection`, `prompt_injection_visible`, `hidden_text`, `lookalike`, `fake_urgency`, `fake_social`, `confirmshame`, `fake_discount`, `subscription_trap`, `prechecked`, `ai_slop`, `insecure`.

## Settings

Defaults are `BonfireScanner.defaults` in `scanner.js`. Options writes the same keys to `chrome.storage.sync`:

- `clipboardShield` boolean
- `showPageBadge` boolean
- `shoppingMode` boolean
- `sensitivity` `"normal"` | `"strict"`

Content listens to `chrome.storage.onChanged` so Options take effect without a full reload (still refresh if the badge was already mounted with old CSS).

## Adding a detector

Edit **only** `src/scanner.js` unless you need new UI copy.

1. Add a regex or DOM helper near the other `*_RE` constants.
2. Inside `scan()`, `findings.push({ id, severity, title, detail })`.
3. Add a matching block to `demo/trap-page.html` so you can see it fire.
4. Reload extension → refresh demo → confirm popup + ember + (if relevant) copy shield.

Keep `scanner.js` free of `chrome.*` so the same file can later run in tests or a Firefox background.

Do not network from the scanner. The product promise is on-device.

## Permissions (keep them boring)

| Permission | Why |
| --- | --- |
| `storage` | Settings + last 5 hosts + copy-guard count |
| `tabs` | Popup/command finds the active tab |
| `activeTab` | Current tab messaging |
| `scripting` | Attach the scanner to a tab that was already open |
| `host_permissions: <all_urls>` | Content script on http(s) pages |

Do not add `clipboardRead` unless you leave the `copy` event model. Do not fetch page HTML to a server.

## UI notes

- Badge CSS is injected into an **open** shadow root from `content.css` (listed in `web_accessible_resources`).
- Popup, options, and legal pages share `theme.css`. No remote fonts.
- Palette: `--bg #111110`, `--accent #c4a574`, `--danger #c45c4a`, `--ok #7d9a86`. Shared in `theme.css`.

## Icons

Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\generate-icons.ps1
```

Writes `icons/icon16.png` … `icon128.png`. Manifest and the on-page badge (`icon32.png`) both need those files present.

## What not to build into this tree

- Silent affiliate rewriting (Chrome Web Store policy)
- Remote code / eval
- Uploading DOM or clipboard contents
- A fake paywall in the free core

## Suggested next engineering work

- Unit-test `BonfireScanner.scan` against `demo/trap-page.html` in jsdom or Playwright
- Persist finding ids for a host so you can diff “what changed”
- Chrome Web Store listing with privacy URL pointed at docs/PRIVACY.md
- Firefox `manifest.json` clone once Chrome usage is proven
