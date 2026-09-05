# Bonfire user guide

This is the longer guide for people using the extension. For install steps, start with the [README](../README.md).

## Install in one minute

1. `chrome://extensions` → **Developer mode** on
2. **Load unpacked** → folder that contains `manifest.json`
3. Pin Bonfire in the toolbar

To confirm it works, serve `demo/trap-page.html` over HTTP (see the README) and look for a low score plus several findings.

## The three surfaces

### Ember badge (on the page)

Bottom-right. Shows `score / 100`. Click it for the list. Shadow root so the site’s CSS does not restyle it.

Hide it in **Options** if you only want the toolbar popup.

### Toolbar popup

Click the Bonfire icon. Score bar, issues, copy guard. **Recent** (last 5 hosts) stays closed until you click it.

**Recheck** runs the detector again on the current tab.

### Options

Right-click the icon → **Options**.

| Setting | Default | Effect |
| --- | --- | --- |
| Copy shield | On | On copy, hostile hidden text is kept off the clipboard |
| Page badge | On | Ember in the corner |
| Shopping mode | On | Fake discounts, trials, pre-checked extras |
| Sensitivity | Normal | Strict walks more hidden nodes and is slightly harsher |

Settings auto-save. Scan history is last 5 hosts on this machine, hidden in the popup until you open Recent. You can clear it in Settings.

## What the score means

The scan starts at **100** and subtracts for each finding:

| Severity | Typical examples | Penalty |
| --- | --- | --- |
| Critical | Hidden agent jailbreak, lookalike domain | large |
| High | Visible jailbreak, HTTP, subscription trap | medium |
| Medium | Urgency theater, confirmshaming, struck prices | smaller |
| Low | Stock “AI filler” phrasing | small |

Labels:

- **85–100 Looks fine** — nothing serious matched
- **65–84 Be careful** — pressure or odd copy; read before you pay or paste into a model
- **40–64 Lots of traps** — several traps; treat AI summaries of this page as hostile
- **0–39 Danger** — hidden instructions or a lookalike host; do not trust the page or any agent reading it

A “Clear” score is not a promise the site is honest. It means Bonfire’s current rules did not fire.

## Finding types (plain language)

| Title you see | What happened |
| --- | --- |
| Hidden instructions for AI agents | HTML hides text like “ignore previous instructions…” so a model sees a different page than you |
| Page asks models to ignore their rules | Same kind of text, but visible |
| Invisible text on the page | Copy is off-screen, zero-size, transparent, or otherwise hidden |
| Lookalike domain | Host is one or two characters off a known brand |
| Urgency pressure | Timers, “only 2 left”, “sale ends” |
| Live social proof that probably is not live | “Maya from Austin just purchased” |
| Confirmshaming | Decline button insults you |
| Compare-at pricing | Struck-through “was” prices |
| Trial that turns into a subscription | Free trial + auto-renew language |
| Pre-checked extras at checkout | Warranty / SMS / tips already ticked |
| Reads like generated filler | Stacked stock LLM phrases; a hint, not proof |
| Not encrypted | `http://` page |

## Copy shield

When you copy from a page that hid jailbreak text, Bonfire:

1. Stops the default copy
2. Puts only the visible, cleaned text on the clipboard
3. Shows a short toast
4. Increments **injections stripped** in the popup

Turn this off in Options if a site’s copy/paste feels broken (rare).

Paste destinations this is for: ChatGPT, Claude, Gemini, Cursor, Notion AI, shopping agents, or any other model that will treat clipboard text as trusted input.

## Shortcut

`Alt+Shift+B` — toggle the on-page findings panel.

If that combo is taken, set another one at `chrome://extensions/shortcuts`.

## What Bonfire cannot see

- `chrome://`, `edge://`, Chrome Web Store, PDF viewer, and most new-tab pages
- Other extensions’ pages
- Text only inside a canvas or image
- A trap that is loaded after you already copied (copy again, or hit Rescan)

## Troubleshooting

**No badge, popup says unavailable**  
The tab is not `http`/`https`, or the content script did not load. Refresh the tab after loading/reloading the extension.

**Demo file from disk does nothing**  
Serve it with `scripts\serve-demo.ps1`, or enable **Allow access to file URLs** on the extension details page.

**Score looks stuck after the page changed**  
Popup → **Rescan**, or wait about a second (the scanner re-runs after DOM changes).

**Copy toast never appears**  
The page may not have matched an injection pattern, or the copy shield is off in Options. Use the trap demo first; that page is supposed to trigger it.

**I reloaded the extension and the old badge is still there**  
Refresh the website tab. Content scripts live in the page, not in the extensions screen.

## Limits (read this)

Bonfire is a heuristic layer. Sites can avoid the current patterns. Do not treat a high score as “safe to enter a password.” Do not treat “reads like generated filler” as proof a human did not write it.
