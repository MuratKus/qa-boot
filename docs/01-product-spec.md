# 01 — Product Spec

## Purpose

QA Boot helps QA engineers and quality leads bootstrap useful project quality context for humans and AI agents.

It should generate a committed QA context layer that describes:

- testing setup,
- build and release process,
- known quality risks,
- unknowns,
- maturity,
- technical repo risk,
- agent boundaries.

## Product modes

### Explore Mode

For a new QA or low-context user.

Explore Mode is scan-heavy and evidence-driven.

It should:

- scan repositories,
- inspect CI/build/test configs,
- discover docs,
- run deterministic evidence providers,
- identify unknowns,
- produce a provisional QA map,
- create follow-up questions for humans.

Explore Mode should not ask deep culture or maturity questions the user cannot answer yet.

### Coach Mode (V2)

> **Not in V1.** Coach Mode depends on capturing human-provided (`told`) facts,
> which are V1.5+. See ADR 0005. V1 ships Explore Mode and Refresh Mode only.

For an embedded QA, QA lead, or quality coach.

Coach Mode is elicitation-heavy and experience-driven.

It should capture:

- which tests are trusted,
- where releases actually happen,
- which docs are stale,
- which teams are automation-skeptical,
- which approvals matter,
- what business areas are sensitive.

Coach Mode should enrich the fact store and convert unknowns/inferences into human-provided facts.

### Refresh Mode

For updating context over time.

Refresh Mode should detect stale facts caused by:

- CI changes,
- build file changes,
- test framework changes,
- release doc changes,
- coverage changes,
- time-based expiry.

## Core principles

### Deterministic first, agent second

If something can be detected reliably with code, detect it with code.

Use scripts for:

- file discovery,
- framework detection,
- CI parsing,
- build command detection,
- coverage artifact detection,
- QA Radar integration,
- fact store updates,
- generated file writing.

Use AI for:

- synthesis,
- interpretation,
- ambiguity handling,
- recommendations,
- coaching-style guidance.

### Unknowns are first-class outputs

Missing knowledge should become an explicit unknown.

Examples:

```text
QA build generation process is unknown.
Release-blocking CI jobs are unknown.
Business criticality of high-risk files is unknown.
```

Unknowns should become onboarding questions.

### Provenance over fake certainty

Every fact should be tagged:

- `observed`
- `inferred`
- `told`
- `unknown`

This prevents weak assumptions from becoming agent truth.

### Technical risk is not business priority

Repo risk signals such as churn, coverage gaps, and missing tests are useful.

They do not automatically prove business criticality.

QA Boot must keep technical risk and business priority separate.

### Claude Code-compatible, but not trapped there

V1 should generate Claude Code-compatible files because that is the practical first target.

Future versions may also generate:

- `AGENTS.md`,
- Cursor rules,
- Codex-compatible instructions,
- generic Markdown context packs.

## Non-goals

QA Boot is not:

- a test generator,
- a full QA automation framework,
- a dashboard,
- a Jira/TestRail replacement,
- a release management tool,
- an autonomous QA agent fleet,
- a generic AI operating system.

V1 should not:

- comment on PRs automatically,
- create tickets automatically,
- trigger CI automatically,
- approve releases,
- access secrets,
- update external systems,
- ask many vague maturity questions.

## Output categories

QA Boot should generate:

- shared QA context files,
- fact store,
- unknowns,
- maturity summary,
- repo risk summary,
- Claude Code skills,
- demo/sample files.

## Main product value

A QA can enter a messy project and quickly see:

- what is known,
- what is missing,
- which areas look risky,
- which docs are absent,
- what to ask the team,
- what Claude must not assume.
