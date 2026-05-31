# 10 — Roadmap

## V0 Prototype

Goal:

Generate useful files from one repo.

Features:

- `qa-boot init`
- `qa-boot scan`
- detect languages/frameworks/tests/CI/docs
- generate `qa-context/unknowns.md`
- generate `CLAUDE.qa.md`
- generate basic `.claude/skills/qa-context/SKILL.md`

## V1 Open-source release

Goal:

Useful public release with a clear demo.

Features:

- TypeScript CLI
- workspace support
- QA Radar adapter
- fact store
- maturity summary
- refresh policy
- multiple Claude skills
- fake org demo
- README demo script
- basic test coverage

## V1.5 Practical hardening

Goal:

Better real-project utility.

Features:

- improved Kotlin/Java/mobile detection
- better Gradle/Fastlane support
- JUnit/Cobertura/LCOV parsing
- stale context detection
- human fact update command
- better workspace summaries

Example future command:

```bash
qa-boot facts add --domain build --provenance told
```

## V2 Knowledge-base awareness

Goal:

Connect repo context to external org knowledge safely.

Features:

- read-only MCP recommendations
- optional Notion/Confluence/Jira source registry
- richer Coach Mode
- maturity/receptivity intake
- portable `AGENTS.md` generation
- knowledge-source freshness tracking

Default posture:

```text
read-only, explicit, scoped, no writes by default
```

## V3 Controlled action layer

Goal:

Support approval-based external actions.

Possible features:

- approval-based PR comments,
- approval-based Jira ticket drafts,
- release readiness report drafts,
- test strategy planning integration,
- richer Claude plugin packaging,
- optional CI trigger suggestions.

Still never allowed by default:

- release approval,
- deployments,
- secrets access,
- production customer data access.

## Long-term positioning

QA Boot should remain the context and safety layer.

It can integrate with other QA agent/tooling systems, but it should not become a giant execution framework.

The long-term value is:

```text
Ground AI-assisted QA in real project context, provenance, unknowns, and permission boundaries.
```
