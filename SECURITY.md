# Security

Bonfire runs with access to the pages you browse. Treat bugs in the scanner, clipboard path, or messaging as in-scope.

## Report a vulnerability

Open a **private** advisory on GitHub if the repository has that enabled. Otherwise email is not listed; use a GitHub issue **without** pasting secrets, session cookies, or full page dumps from private sites.

Please include:

- Bonfire version (`manifest.json`)
- Chrome version
- Steps to reproduce
- What you expected vs what happened

Do not use this tool to attack systems you do not own.

## Scope notes

False positives on a public page are not vulnerabilities. Missing a dark pattern is a product gap, not a security hole, unless it causes Bonfire itself to leak data or execute untrusted code.
