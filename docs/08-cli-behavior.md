# 08 — CLI Behavior

## CLI philosophy

The CLI should be boring, deterministic, and predictable.

It should generate files and reports.

It should not require an AI agent to run scans.

## Commands

### `qa-boot init`

Initializes QA Boot config in the current repo.

Creates:

```text
qa-boot.config.json
qa-context/README.md
```

Should ask minimal questions:

- project name,
- single repo or workspace,
- Claude output enabled yes/no,
- use QA Radar if available yes/no.

### `qa-boot scan`

Runs deterministic scanners. **`facts.json` is the only thing `scan` writes
directly** — all Markdown is produced by `generate`, which `scan` auto-runs at
the end (unless `--no-generate`).

Should:

- inspect repo structure,
- detect tests/build/CI/docs,
- run QA Radar if enabled/available,
- write/update `qa-context/facts.json` (upsert by id — see doc 04),
- then invoke `generate` unless `--no-generate` is passed.

### `qa-boot generate`

Generates **all** Markdown context and Claude Code files from `facts.json`.
`facts.json` is the single source of truth; these outputs are always fully
regenerated and should not be hand-edited.

Should write:

- `qa-context/unknowns.md`,
- `qa-context/repo-risk.md` (when QA Radar facts exist),
- the other `qa-context/*.md` summaries,
- `CLAUDE.qa.md`,
- `.claude/skills/**/SKILL.md`.

### `qa-boot refresh`

Re-runs `scan` and reports what changed.

Should:

- re-run scanners and the merge algorithm (doc 04),
- update `last_verified` on re-emitted facts,
- mark missing/expired facts stale,
- auto-run `generate` (same as `scan`),
- print a **diff summary**: facts added, updated, newly stale, dropped.

### `qa-boot status`

Shows current QA Boot state.

Example output:

```text
QA Boot status

Facts: 42
Unknowns: 13
Observed facts: 21
Inferred facts: 8
Told facts: 0
Stale facts: 4
QA Radar: available
Claude skills: generated
Last scan: 2026-05-30
```

## Workspace commands

### `qa-boot workspace init`

Creates:

```text
qa-workspace/qa-workspace.json
```

### `qa-boot workspace add-repo`

Example:

```bash
qa-boot workspace add-repo ../mobile-app --type mobile
qa-boot workspace add-repo ../api --type backend
```

### `qa-boot workspace scan`

Scans all configured repos and generates cross-system unknowns.

### `qa-boot workspace generate`

Generates workspace summaries:

```text
qa-workspace/repos/*.md
qa-workspace/cross-system/*.md
```

## Flags

### QA Radar

```bash
--with-qaradar
--skip-qaradar
--base origin/main
```

Behavior:

- `--with-qaradar`: try to run QA Radar.
- `--skip-qaradar`: do not run QA Radar.
- `--base`: run diff-aware risk analysis if supported.

### Output

```bash
--output ./qa-context
--format markdown,json
--no-claude
--no-generate
```

`--no-generate` makes `scan`/`refresh` write `facts.json` only and skip the
auto-generate step. Run `qa-boot generate` separately to render Markdown.

### Safety

```bash
--dry-run
--no-write
```

## Error behavior

QA Boot should continue when optional providers fail.

Example:

```text
QA Radar not available. Continuing with built-in scanners.
```

If a required write fails:

```text
Could not write qa-context/facts.json. Check file permissions.
```

## Prompting behavior

V1 should avoid long interactive questioning.

Default should be:

```text
scan first, ask later
```

The CLI can generate questions from unknowns instead of asking everything upfront.

## Config example

```json
{
  "project_name": "example-service",
  "mode": "single-repo",
  "claude": {
    "enabled": true,
    "generate_skills": true
  },
  "evidence_providers": {
    "qaradar": {
      "enabled": "auto",
      "base": "origin/main"
    }
  },
  "refresh": {
    "default_days": 30
  }
}
```
