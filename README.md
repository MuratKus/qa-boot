# QA Boot

Bootstrap QA context for AI coding agents.

QA Boot scans a repository or multi-repo workspace, collects deterministic testing/build/CI evidence, captures unknowns, and generates Claude Code-compatible QA context files.

It helps QA engineers and quality leads onboard into messy projects without letting AI agents invent missing process knowledge.

QA Boot is not a test generator or QA automation framework. It is the context and safety layer before AI-assisted QA work.

## Core idea

Most AI QA tooling focuses on generating, executing, or reviewing tests.

QA Boot focuses on the missing layer before that:

- What does this project know?
- What is unknown?
- Which facts are observed, inferred, or human-provided?
- Which quality risks are technical versus business-critical?
- What is Claude allowed to assume?
- What should Claude ask before acting?

## V1 product boundary

V1 is a CLI-first file generator.

It should:

- scan repos deterministically,
- consume evidence providers like QA Radar,
- generate `qa-context/`,
- generate Claude Code project skills,
- generate unknowns and maturity summaries,
- avoid external writes by default.

V1 should not:

- auto-comment on PRs,
- auto-create Jira tickets,
- update TestRail,
- trigger CI,
- approve releases,
- access secrets,
- act as a full autonomous QA agent.

## Usage (V0 prototype)

The V0 CLI is implemented and verified end-to-end. From a repo you want to scan:

```bash
npm install && npm run build      # one-time, from the qa-boot checkout

# then, inside the target repo:
node <path-to-qa-boot>/dist/cli/index.js init --project-name my-service
node <path-to-qa-boot>/dist/cli/index.js scan        # auto-runs generate
```

`scan` detects languages/tests/CI/docs/build/agent-config, writes
`qa-context/facts.json`, and (unless `--no-generate`) renders the `qa-context/*.md`
summaries, `unknowns.md`, `maturity.md`, `CLAUDE.qa.md`, and four `.claude/skills`.

QA Radar is consumed live when installed:

```bash
node .../dist/cli/index.js scan --with-qaradar   # spawns `qaradar analyze --json-output`
node .../dist/cli/index.js scan --skip-qaradar   # built-in scanners only
```

When `qaradar` is absent the scan still succeeds and records the gap as an
unknown (`repo-risk.md` is only written when QA Radar ran).

Design and plan: [`docs/superpowers/specs/2026-06-02-qa-boot-v0-design.md`](./docs/superpowers/specs/2026-06-02-qa-boot-v0-design.md)
and [`docs/superpowers/plans/2026-06-02-qa-boot-v0.md`](./docs/superpowers/plans/2026-06-02-qa-boot-v0.md).

## Start here

Read [`SPEC_INDEX.md`](./SPEC_INDEX.md) first.

For implementation planning, start with:

- [`docs/00-overview.md`](./docs/00-overview.md)
- [`docs/02-v1-scope.md`](./docs/02-v1-scope.md)
- [`docs/03-architecture.md`](./docs/03-architecture.md)

## Tagline

> Make Claude more grounded before making it more autonomous.
