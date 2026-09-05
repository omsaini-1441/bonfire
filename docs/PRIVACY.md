# Privacy Policy

Effective: 5 September 2026  
Product: Bonfire browser extension  
This policy applies to the extension as distributed in this repository. It is written for users and for Chrome Web Store listing. It is not legal advice.

## Summary

Bonfire is free. It has no account and no company server. It reads the webpage already open in your tab, on your device. It does not upload that page, your clipboard, or your scores.

## Who we are

Bonfire is open-source software released by its authors under the MIT License. There is no separate data controller operating a backend for this version.

## What the extension accesses

To score a page it must read the DOM of sites you visit (`http` and `https`). That is why it requests access to all such sites. Reading happens in the tab. Page HTML is not sent to the authors or to a third-party API by this code.

Permissions used:

- **storage** — settings and a short local history
- **tabs / activeTab / scripting** — talk to the current tab and attach the scanner
- **host access to http(s) pages** — run on normal websites

## What is stored

| Data | Place | Purpose | Period |
| --- | --- | --- | --- |
| Settings (copy guard, badge, checkout checks, sensitivity) | `chrome.storage.sync` | Remember preferences | Until you change them or uninstall |
| Last 5 hostnames, score, issue count, time | `chrome.storage.local` | Recent list, shown only if you open it | Overwritten; max 5 hosts |
| Count of copy-guard events | `chrome.storage.local` | Show “Idle” vs times cleaned | Until you clear it or uninstall |

We do not store page bodies, form fields, passwords, payment data, or copied text.

Settings may sync with your Chrome/Google profile if you use Chrome sync. That sync is Google’s service, not ours.

## What we do not do (this version)

- No analytics SDK
- No advertising ID
- No sale of personal data
- No remote fetch of page content for scoring
- No affiliate rewriting of checkout links

## Clipboard

If copy guard is on and a hidden-instruction pattern matches, Bonfire may replace the text placed on the clipboard with visible text only. That happens in the page. The discarded hidden text is not saved.

## Children

Bonfire is a general browser tool. It is not directed at children and does not knowingly collect personal information from children.

## Your choices

- Turn off copy guard or the badge in Settings
- Clear recent hosts and the copy-guard count in Settings
- Uninstall the extension to delete its `chrome.storage` data

## Changes

If a future version sends data off-device, that will require an update to this policy and, where required, a new permission or an opt-in. This file is the source of truth in the repo.

## Contact

Open a GitHub issue on the project repository. Do not send passwords, dumps of private pages, or personal data in issues.

## Chrome Web Store

If you install from the Chrome Web Store, this same policy applies. Use the repository copy of this file as the privacy policy URL until a dedicated site exists.
