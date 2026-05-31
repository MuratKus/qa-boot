# 00 — Overview

## Working title

**QA Context Bootloader**

Short name:

```text
qa-boot
```

Tagline:

```text
Bootstrap QA context for AI coding agents.
```

## One-line summary

QA Boot is an open-source CLI that scans one or more repositories, collects deterministic QA/testing/build/release evidence, records unknowns explicitly, and generates Claude Code-compatible QA context so agents can help with quality work without guessing.

## Problem

AI coding agents are useful inside a repository, but QA work depends on more than code.

A QA engineer joining a project needs to understand:

- how to get a build,
- which CI jobs matter,
- which tests are trusted,
- which environments are stable,
- which release gates are real,
- who approves risky changes,
- where product requirements live,
- where A/B testing decisions live,
- which business areas are sensitive,
- what an AI agent is allowed to do.

Most of this knowledge is scattered across repositories, CI systems, docs, issue trackers, knowledge bases, and people’s heads.

If an AI agent does not know this context, it may invent plausible answers.

For QA, that creates false confidence.

## Product thesis

Useful AI-assisted QA requires a project/org context layer before it requires more QA agents.

QA Boot is that boot layer.

It should:

1. discover what can be known deterministically,
2. capture what only humans know,
3. mark assumptions and unknowns,
4. define safe agent boundaries,
5. generate reusable context files and Claude Code skills,
6. recommend which QA capabilities are safe and useful for the current maturity level.

## Main users

### New QA engineer

Needs evidence-driven onboarding. They do not know the org yet.

QA Boot should help them find:

- what exists,
- what is missing,
- what to ask,
- what not to assume.

### QA lead / quality coach

Knows the team and process but needs to capture tacit quality knowledge.

QA Boot should help them encode:

- maturity,
- trust in tests,
- release reality,
- automation receptivity,
- agent permission boundaries.

### AI coding agent

Needs structured QA context, guardrails, and explicit unknowns.

The agent should know when to help and when to say:

```text
This is unknown. Ask a human before assuming.
```

## Core distinction

```text
QA Radar = technical repo-risk intelligence.
QA Boot = QA/org context bootloader for AI agents.
```

QA Radar can say which files look risky.

QA Boot says what those risks mean in context, what is unknown, and what Claude is allowed to assume.

## Core promise

```text
Make Claude more grounded before making it more autonomous.
```
