# qa-boot npm Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `qa-boot` installable from the npm registry so anyone can run `npx qa-boot init` / `npx qa-boot scan`, and publish 0.1.0.

**Architecture:** No behavior changes to the CLI. Package hygiene in `package.json` (files whitelist, metadata, prepublishOnly safety hook), a runtime version lookup so `--version` tracks package.json, LICENSE/README/RELEASING docs, tarball smoke test, then a manual `npm publish` performed with the user logged in.

**Tech Stack:** Node 20+, TypeScript (tsc build), vitest, npm registry.

**Spec:** `docs/superpowers/specs/2026-06-11-npm-distribution-design.md`

**Context for workers:**
- The repo already has `"bin": { "qa-boot": "dist/cli/index.js" }` and a shebang in `src/cli/index.ts`; do not change those.
- The CLI version is hardcoded as `"0.0.0"` in `src/cli/index.ts:10`. Task 1 fixes that.
- Tests live under `test/` mirroring `src/`, vitest, direct function calls (no process spawning). Run with `npm test`.
- Tasks 4 and 5 are verification/release tasks run in the main session (they need the user's npm login); they are not subagent material.

---

### Task 1: `--version` reads from package.json

**Files:**
- Create: `src/cli/version.ts`
- Create: `test/cli/version.test.ts`
- Modify: `src/cli/index.ts` (line 10, the `program.name(...).version("0.0.0")` chain)

- [ ] **Step 1: Write the failing test**

Create `test/cli/version.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { cliVersion } from "../../src/cli/version.js";

describe("cliVersion", () => {
  it("matches the version in package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(cliVersion()).toBe(pkg.version);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/cli/version.test.ts`
Expected: FAIL — cannot resolve `../../src/cli/version.js` (module does not exist).

- [ ] **Step 3: Write minimal implementation**

Create `src/cli/version.ts`:

```ts
import { createRequire } from "node:module";

export function cliVersion(): string {
  const pkg = createRequire(import.meta.url)("../../package.json") as { version: string };
  return pkg.version;
}
```

Why `createRequire` and not a JSON import: the path resolves relative to the compiled file. From `src/cli/version.ts` (dev via tsx) and from `dist/cli/version.js` (built, and inside an installed `node_modules/qa-boot/`), `../../package.json` lands on the package root `package.json` in all three cases. A static `import` of a file outside `rootDir: src` would break the tsc build.

- [ ] **Step 4: Wire into the CLI**

In `src/cli/index.ts`, add the import and replace the hardcoded version:

```ts
import { cliVersion } from "./version.js";
```

and change

```ts
program.name("qa-boot").description("Bootstrap QA context for AI coding agents.").version("0.0.0");
```

to

```ts
program.name("qa-boot").description("Bootstrap QA context for AI coding agents.").version(cliVersion());
```

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all tests pass including the new one.

- [ ] **Step 6: Commit**

```bash
git add src/cli/version.ts test/cli/version.test.ts src/cli/index.ts
git commit -m "feat: CLI --version reads version from package.json"
```

---

### Task 2: package.json hygiene + LICENSE

**Files:**
- Modify: `package.json`
- Create: `LICENSE`

- [ ] **Step 1: Update package.json**

Replace the full contents of `package.json` with (only `version`, `keywords`, `author`, `license`, `repository`, `homepage`, `bugs`, `files`, and the `prepublishOnly` script are new/changed — dependencies stay exactly as they are):

```json
{
  "name": "qa-boot",
  "version": "0.1.0",
  "description": "Bootstrap QA context for AI coding agents.",
  "keywords": ["qa", "testing", "claude-code", "ai-agents", "onboarding", "qa-context", "cli"],
  "author": "Murat Kus",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/MuratKus/qa-boot.git"
  },
  "homepage": "https://github.com/MuratKus/qa-boot#readme",
  "bugs": {
    "url": "https://github.com/MuratKus/qa-boot/issues"
  },
  "type": "module",
  "bin": {
    "qa-boot": "dist/cli/index.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/cli/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prepublishOnly": "npm run build && npm run typecheck && npm test"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "fast-glob": "^3.3.2",
    "minimatch": "^9.0.9",
    "yaml": "^2.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create LICENSE**

Create `LICENSE` with the standard MIT text:

```text
MIT License

Copyright (c) 2026 Murat Kus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Verify the tarball contents (dry run)**

Run: `npm run build && npm pack --dry-run`
Expected: the printed file list contains `package.json`, `README.md`, `LICENSE`, and files under `dist/` only. It must NOT contain anything from `src/`, `test/`, `test-fixtures/`, `fixtures/`, `docs/`, or `scripts/`. (npm always includes README, LICENSE, and package.json automatically; `files: ["dist"]` whitelists the rest.)

- [ ] **Step 4: Verify the version test still passes**

Run: `npm test`
Expected: all pass — in particular `test/cli/version.test.ts` now asserts `cliVersion() === "0.1.0"`.

- [ ] **Step 5: Commit**

```bash
git add package.json LICENSE
git commit -m "feat: publishable package - 0.1.0, files whitelist, MIT, prepublishOnly gate"
```

---

### Task 3: README install section + RELEASING.md

**Files:**
- Modify: `README.md` (the `## Usage (V0 prototype)` section, currently lines 47–74)
- Create: `RELEASING.md`

- [ ] **Step 1: Replace the README usage section**

In `README.md`, replace everything from the `## Usage (V0 prototype)` heading up to (not including) the `## Start here` heading with:

```markdown
## Install & usage

Run qa-boot directly in any repo — no install step needed:

```bash
npx qa-boot init --project-name my-service
npx qa-boot scan        # auto-runs generate
```

`scan` detects languages/tests/CI/docs/build/agent-config, writes
`qa-context/facts.json`, and (unless `--no-generate`) renders the `qa-context/*.md`
summaries, `unknowns.md`, `maturity.md`, `CLAUDE.qa.md`, and the `.claude/skills`.

Record human-told QA knowledge (answers to open unknowns, or free-form facts):

```bash
npx qa-boot tell <unknown-id> "the answer" --by alice
npx qa-boot tell "we release every Tuesday" --domain process --by alice
```

Prefer a permanent command? `npm install -g qa-boot` gives you `qa-boot` on your
PATH; `npm install -D qa-boot` pins a version per-project.

QA Radar is consumed live when installed:

```bash
npx qa-boot scan --with-qaradar   # spawns `qaradar analyze --json-output`
npx qa-boot scan --skip-qaradar   # built-in scanners only
```

When `qaradar` is absent the scan still succeeds and records the gap as an
unknown (`repo-risk.md` is only written when QA Radar ran).

### Developing qa-boot itself

```bash
git clone https://github.com/MuratKus/qa-boot.git
cd qa-boot && npm install
npm test                 # vitest
npm run dev -- scan      # run the CLI from source via tsx
```

Design and plan: [`docs/superpowers/specs/2026-06-02-qa-boot-v0-design.md`](./docs/superpowers/specs/2026-06-02-qa-boot-v0-design.md)
and [`docs/superpowers/plans/2026-06-02-qa-boot-v0.md`](./docs/superpowers/plans/2026-06-02-qa-boot-v0.md).
```

(Note for the worker: the inner code fences are part of the README content; adjust fence nesting as needed when editing.)

- [ ] **Step 2: Create RELEASING.md**

```markdown
# Releasing qa-boot

Published versions are immutable — never try to re-publish a version. Fix
forward: patch the code, bump, publish again.

```bash
npm version patch        # or minor / major — bumps version, commits, tags
npm publish              # prepublishOnly runs build + typecheck + tests first
git push --follow-tags
```

That's the whole release. If `npm publish` fails on auth, run `npm login` first.
`qa-boot --version` reports the version automatically (read from package.json).
```

- [ ] **Step 3: Commit**

```bash
git add README.md RELEASING.md
git commit -m "docs: npx install instructions + release checklist"
```

---

### Task 4: Tarball smoke test (run in main session)

Verifies a stranger's install works before anything goes live. No repo file changes.

- [ ] **Step 1: Build the real tarball**

From the qa-boot checkout:

```bash
npm run build && npm pack
```

Expected: creates `qa-boot-0.1.0.tgz` in the repo root.

- [ ] **Step 2: Install it in a fresh temp project**

```powershell
$tmp = Join-Path $env:TEMP "qaboot-smoke-$(Get-Random)"
New-Item -ItemType Directory $tmp | Out-Null
Set-Location $tmp
npm init -y
npm install C:\Users\Murat\Projects\qa-boot\qa-boot-0.1.0.tgz
```

Expected: installs without errors, `node_modules/.bin/qa-boot` exists.

- [ ] **Step 3: Run the CLI the way a newcomer would**

Still in `$tmp` (it is itself a scratch "repo" — add a README so scan has something to see):

```powershell
Set-Content README.md "# smoke fixture"
npx qa-boot --version        # expected: 0.1.0
npx qa-boot init --project-name smoke
npx qa-boot scan
```

Expected: `--version` prints `0.1.0`; `qa-boot.config.json`, `qa-context/facts.json`, `qa-context/unknowns.md`, `qa-context/maturity.md` exist afterwards.

- [ ] **Step 4: Clean up**

```powershell
Set-Location C:\Users\Murat\Projects\qa-boot
Remove-Item -Recurse -Force $tmp
Remove-Item qa-boot-0.1.0.tgz
```

(Do not commit the tarball; it's a build artifact.)

---

### Task 5: Publish 0.1.0 (run in main session, needs user login)

- [ ] **Step 1: Confirm npm login**

Run: `npm whoami`
If it errors, pause and ask the user to type `! npm login` in the prompt (interactive browser flow) and confirm with `npm whoami` afterwards.

- [ ] **Step 2: Publish**

```bash
npm publish
```

Expected: `prepublishOnly` runs build + typecheck + tests, then uploads. Output ends with `+ qa-boot@0.1.0`.

- [ ] **Step 3: Tag the release and push**

This first release set the version by hand (Task 2), so create the tag manually; future releases use `npm version` per RELEASING.md.

```bash
git tag v0.1.0
git push --follow-tags
```

- [ ] **Step 4: Post-publish smoke test from a clean directory**

```powershell
Set-Location $env:TEMP
npx --yes qa-boot@0.1.0 --version
```

Expected: prints `0.1.0` (may take a minute for the registry to settle; retry once if 404).

- [ ] **Step 5: Report**

Tell the user: package is live, `npx qa-boot init` works anywhere, and RELEASING.md documents future releases.
