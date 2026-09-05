# Bonfire

Free Chrome extension. Checks the **current tab** for hidden text, fake urgency, and checkout tricks. Runs on your machine. No account.

**0 / 100** = many flags. **100 / 100** = nothing matched. Lower is worse. A high score is not a promise the site is safe.

Load it unpacked from this repo (below), or wait for a Chrome Web Store listing. Licensed under [MIT](LICENSE). By using it you accept [Terms](docs/TERMS.md). [Privacy](docs/PRIVACY.md).

## Install (Chrome or Edge)

1. Clone or download this repository.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. **Load unpacked** → select the folder that contains `manifest.json`.
5. Pin Bonfire in the toolbar.

Reload the extension after you pull updates, then click the icon on a normal `https` site. Chrome’s own screens (`chrome://…`, Web Store, new tab) cannot be scanned.

### Practice page

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\serve-demo.ps1
```

Open [http://127.0.0.1:8765/trap-page.html](http://127.0.0.1:8765/trap-page.html). That store is **fake** and is built to score badly.

## What you see

- Toolbar popup: score, bar from **unsafe 0** to **clear 100**, list of issues
- Corner badge on pages: `score / 100`
- Copy guard: may strip hidden jailbreak text when you copy
- **Recent**: last 5 hosts, **hidden until you click it**
- Settings: right-click the icon → Options (auto-saves)

It does not run a website of its own and does not upload pages.

## Not a guarantee

Heuristics only. Not antivirus, not legal or shopping advice, not proof of “AI vs human.” You are responsible for what you buy, type, and paste. Details: [docs/TERMS.md](docs/TERMS.md).

## Docs

| Doc | For |
| --- | --- |
| [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | How to use it |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | How to change it |
| [docs/PRIVACY.md](docs/PRIVACY.md) | What is stored |
| [docs/TERMS.md](docs/TERMS.md) | Disclaimer and liability limits |
| [SECURITY.md](SECURITY.md) | How to report a hole |

Chrome Web Store privacy policy URL: use the GitHub file `docs/PRIVACY.md` once this repo is public.

## License

[MIT](LICENSE) © 2026 Bonfire authors. Provided **AS IS**, without warranty.
