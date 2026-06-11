# Releasing qa-boot

Published versions are immutable — never try to re-publish a version. Fix
forward: patch the code, bump, publish again.

```bash
npm version patch        # or minor / major — bumps version, commits, tags
npm publish              # prepublishOnly runs build + typecheck + tests first
git push --follow-tags
```

That's the whole release. If `npm publish` fails on auth, run `npm login` first.
Never publish with `--ignore-scripts` — it skips the prepublishOnly safety gate.
`qa-boot --version` reports the version automatically (read from package.json).
