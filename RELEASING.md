# Releasing qa-boot

Published versions are immutable — never try to re-publish a version. Fix
forward: patch the code, bump, publish again.

```bash
npm version patch        # or minor / major — bumps version, commits, tags
npm publish              # prepublishOnly runs build + typecheck + tests first
git push --follow-tags
```

That's the whole release. If `npm publish` fails on auth, run `npm login` first.
Run `npm publish` from a real terminal window, not an AI/CI shell: the account
uses passkey 2FA, so npm opens a browser for Windows Hello confirmation — in a
non-interactive shell that step fails with `EOTP` (or a stale-token `E404`; if
`npm whoami` says 401, log in again).
Never publish with `--ignore-scripts` — it skips the prepublishOnly safety gate.
`qa-boot --version` reports the version automatically (read from package.json).
