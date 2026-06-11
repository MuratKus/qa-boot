# qa-boot npm distribution — design

**Date:** 2026-06-11
**Status:** Approved (brainstorm with Murat)
**Goal:** Close the distribution gap. Today installing qa-boot means clone + build + invoke `dist/cli/index.js` by path. After this work, anyone can run `npx qa-boot init` / `npx qa-boot scan` in any repo, and Murat has a 3-command ritual for shipping future versions.

## Decisions made

- **Release flow:** manual `npm publish` from Murat's machine. No CI publishing, no release-please — can graduate later; nothing in this design blocks that.
- **License:** MIT.
- **Package name:** `qa-boot` (verified free on npm registry on 2026-06-11).
- **Build:** publish the existing `tsc` output as-is. No bundler (tsup/esbuild rejected as YAGNI — 4 small pure-JS runtime deps, negligible cold-start win).
- **Scope of this session:** publish 0.1.0 for real, not just publish-ready.

## Verified facts the design relies on

- `package.json` already declares `"bin": { "qa-boot": "dist/cli/index.js" }` and `"engines": { "node": ">=20" }`.
- Shebang (`#!/usr/bin/env node`) is present in both `src/cli/index.ts` and the built `dist/cli/index.js`.
- No runtime file dependencies on the package's own tree: zero uses of `__dirname` / `import.meta.url` / `fileURLToPath` in `src/`. All templates (skills, context files) are embedded in code. The tarball therefore needs only `dist/`, README, LICENSE, package.json.
- Runtime deps: commander, fast-glob, minimatch, yaml.

## Changes

### 1. package.json hygiene

- `version`: `0.0.0` → `0.1.0`.
- `files`: `["dist"]` — whitelist so source, tests, fixtures, docs never ship.
- `license`: `MIT`.
- `repository`, `homepage`, `bugs`: pointing at `github.com/MuratKus/qa-boot`.
- `author`: Murat Kus.
- `keywords`: `qa`, `testing`, `claude-code`, `ai-agents`, `onboarding`, `qa-context`, `cli`.
- `prepublishOnly` script: `npm run build && npm run typecheck && npm test` — publish is blocked unless the package rebuilds cleanly and all tests pass. This is the safety latch against publishing stale or broken code.

### 2. LICENSE file

Standard MIT text, copyright Murat Kus, 2026.

### 3. README install/usage rewrite

Replace the "Usage (V0 prototype)" clone-and-find-dist instructions with the published-package story:

```bash
npx qa-boot init --project-name my-service
npx qa-boot scan
```

Plus brief mention of `npm install -g qa-boot` and `npm install -D qa-boot` as alternatives, and a short "developing qa-boot itself" note retaining the clone/build instructions for contributors.

### 4. RELEASING.md

Ten-line cheat sheet for future releases:

```bash
npm version patch   # or minor / major — bumps version, commits, tags
npm publish         # prepublishOnly runs build + typecheck + tests first
git push --follow-tags
```

Plus one line on the immutability rule: published versions can't be changed; fix forward with a new patch version.

## Verification (before publish)

1. `npm pack` — produce the exact tarball npm would upload.
2. Inspect the tarball file list: contains `dist/`, `package.json`, `README.md`, `LICENSE` and nothing else.
3. Install the tarball into a fresh temp project (`npm init -y && npm install <tarball>`) **outside** the qa-boot checkout — same resolution path a stranger gets, without polluting the global install.
4. In a scratch repo, run `init` and `scan` via the installed binary (`node_modules/.bin/qa-boot`); confirm `qa-context/` output is correct.
5. Only then publish.

## Publish step

- Requires Murat logged in to npm (`npm login`, browser flow). Session pauses for this; suggest `! npm login` so the interactive flow runs in-session.
- `npm publish` (first publish of an unscoped package is public by default).
- Post-publish smoke test: `npx qa-boot@0.1.0 --help` from a clean directory.

## Error handling / rollback

- Published versions are immutable. Any post-publish defect is fixed forward: patch the code, `npm version patch`, publish `0.1.1`.
- `npm unpublish` exists within 72h but is deliberately not part of the process — fix-forward is cheaper and doesn't break early adopters.

## Out of scope

- CI/automated publishing (future graduation path, nothing here blocks it).
- Bundling/minification.
- Any CLI behavior changes — `init`/`scan`/`generate`/`tell` ship exactly as they are on `main`.
