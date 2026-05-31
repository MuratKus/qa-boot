# 02 — V1 Scope

## V1 shape

V1 is a CLI-first file generator.

It should not require external services to be useful.

V1 is **read-only and deterministic** (see ADR 0005):

- no human-provided (`told`) facts — those are V1.5,
- no Coach Mode — that is V2,
- V1 supports **Explore Mode** and **Refresh Mode** only,
- `facts.json` is the single source of truth; `scan` writes facts and auto-runs
  `generate`, which produces all Markdown and Claude files.

V1 still generates onboarding *questions* from unknowns. It does not ingest the
answers.

## V1 goals

V1 should prove that QA Boot can:

1. scan a repo,
2. generate useful QA context,
3. mark unknowns explicitly,
4. consume QA Radar as a deterministic evidence provider,
5. generate Claude Code-compatible project files,
6. work on a simple multi-repo workspace,
7. support a clear demo.

## V1 commands

Single repo:

```bash
qa-boot init
qa-boot scan
qa-boot generate
qa-boot refresh
qa-boot status
```

Workspace:

```bash
qa-boot workspace init
qa-boot workspace add-repo ../mobile-app --type mobile
qa-boot workspace add-repo ../api --type backend
qa-boot workspace scan
qa-boot workspace generate
qa-boot workspace status
```

QA Radar:

```bash
qa-boot scan --with-qaradar
qa-boot scan --skip-qaradar
qa-boot scan --base origin/main
qa-boot workspace scan --with-qaradar
```

## V1 in scope

- TypeScript CLI
- config file
- single-repo scan
- basic workspace scan
- repo scanner
- test scanner
- CI scanner
- docs scanner
- build/release scanner
- agent config scanner
- fact store
- unknowns generation
- maturity summary
- QA Radar adapter
- Claude Code project skill generation
- `CLAUDE.qa.md` generation
- Markdown reports
- fake org demo
- basic tests for scanners/generators

## V1 out of scope

- human-provided (`told`) facts and `qa-boot facts add` (V1.5)
- Coach Mode (V2)
- interactive elicitation of tacit quality knowledge
- dashboard UI
- hosted service
- Jira integration
- TestRail integration
- Notion write integration
- Confluence integration
- Slack integration
- PR comments
- ticket creation
- CI triggering
- automatic test generation
- automatic flake fixing
- production telemetry integrations
- authentication system

## V1 generated output

Single repo:

```text
qa-context/
  README.md
  facts.json
  unknowns.md
  repo-risk.md
  test-stack.md
  build-and-run.md
  ci-and-release.md
  environments.md
  test-data.md
  product-risk-map.md
  quality-risks.md
  maturity.md
  knowledge-sources.md
  refresh-policy.md

.claude/
  skills/
    qa-context/
      SKILL.md
    qa-risk/
      SKILL.md
    qa-unknowns/
      SKILL.md
    qa-refresh/
      SKILL.md
    qa-release-readiness/
      SKILL.md
    qa-pr-risk/
      SKILL.md

CLAUDE.qa.md
qa-boot.config.json
```

Workspace:

```text
qa-workspace/
  qa-workspace.json
  facts.json
  unknowns.md
  repos/
    mobile-app.md
    api.md
    admin-web.md
  cross-system/
    system-map.md
    build-flow.md
    release-flow.md
    quality-risk-map.md
    product-risk-map.md
    maturity.md
```

## Acceptance criteria

V1 is successful if:

1. A user can run `qa-boot scan` on a repo and get meaningful QA context files.
2. A user can run workspace mode on two repos.
3. The tool detects basic languages, tests, CI configs, and docs.
4. The tool explicitly lists important unknowns.
5. QA Radar can be consumed as an optional evidence provider.
6. `repo-risk.md` is generated when QA Radar data exists.
7. Claude Code skills are generated.
8. Claude can use generated context to answer QA questions more specifically.
9. Claude refuses to guess when required facts are unknown.
10. The fake org demo shows the value in under three minutes.

## V1 product boundary

The simplest v1 loop is:

```text
scan repo(s) → run QA Radar if available → write facts.json → auto-generate unknowns/context/skills → Claude stops guessing
```

`scan` auto-runs `generate` unless `--no-generate` is passed. When a required
fact is unknown, Claude is told to surface the exact question to ask a human
rather than guess. V1 does not capture the answer back into the fact store.
