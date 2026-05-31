# 07 — Claude Code Output

## Goal

V1 should generate Claude Code-compatible project context and skills.

The generated files should help Claude answer QA/testing/release questions more specifically and avoid guessing when required facts are unknown.

## Generated files are tool-owned

Every file under `qa-context/`, `.claude/skills/`, and `CLAUDE.qa.md` is fully
regenerated from `facts.json` on each `generate`. They must not be hand-edited —
edits are overwritten. In V1 there is no human edit surface (told facts are
V1.5); `facts.json` is produced by scanners. (ADR 0005)

## qa-context file templates

Each `qa-context/*.md` summary renders the facts for one domain. The standard
shape is:

```md
# <Title>

<one-line purpose>

## Known
- <statement> — _<provenance>, confidence <n>_ (evidence: `<path>`)

## Unknown
- <what is missing>
  - **Ask a human:** <the exact question to ask>
```

When a domain has no observed facts, the file is **not blank** — the "everything
unknown" shape is a first-class output:

```md
# Environments

QA Boot could not determine environment setup from the repository.

## Unknown
- Which environments exist (dev/staging/prod) is unknown.
  - **Ask a human:** What test environments exist, which is stable, and how is
    test data reset?
```

File-to-domain mapping:

| File | Primary domain(s) |
|---|---|
| `test-stack.md` | `test` |
| `build-and-run.md` | `build` |
| `ci-and-release.md` | `ci`, `release` |
| `environments.md` | `environment` |
| `test-data.md` | `test_data` |
| `repo-risk.md` | `repo_quality` (QA Radar) |
| `product-risk-map.md` | `business_priority` — almost always all-unknown in V1 |
| `quality-risks.md` | synthesis of `repo_quality` + unknowns |
| `maturity.md` | `maturity` (rubric, doc 04) |
| `knowledge-sources.md` | `knowledge_sources` |
| `refresh-policy.md` | refresh/staleness settings (doc 04) |
| `unknowns.md` | all `unknown` facts grouped by domain |

`product-risk-map.md`, `environments.md`, and `test-data.md` are expected to be
mostly unknown in V1 — they exist to make the gap explicit and generate the
human questions, not to fabricate answers.

## Main context file

Path:

```text
CLAUDE.qa.md
```

Purpose:

- explain QA context,
- point Claude to generated files,
- define rules,
- prevent assumptions.

Example section:

```md
# QA Context Instructions

Before answering QA/testing/release questions, check the files in `qa-context/`.

Important:
- Do not assume missing build, release, environment, or ownership knowledge.
- If a required fact is marked unknown, say so.
- Use `qa-context/repo-risk.md` for technical repo risk.
- Do not treat repo risk as business priority unless confirmed in `product-risk-map.md`.
- Do not suggest external writes unless explicitly approved by the user.
```

## Generated skills

V1 should generate:

```text
.claude/skills/qa-context/SKILL.md
.claude/skills/qa-risk/SKILL.md
.claude/skills/qa-unknowns/SKILL.md
.claude/skills/qa-refresh/SKILL.md
.claude/skills/qa-release-readiness/SKILL.md
.claude/skills/qa-pr-risk/SKILL.md
```

## Skill: qa-context

Purpose:

Load and summarize the current QA context.

Use cases:

- “What do we know about testing in this repo?”
- “How should I onboard into QA here?”
- “What does this project’s QA setup look like?”

Rules:

- Read `qa-context/`.
- Separate observed, inferred, told, and unknown.
- Mention stale context if detected.

## Skill: qa-risk

Purpose:

Answer repo-risk questions using deterministic evidence, especially QA Radar output.

Use cases:

- “What should I test first?”
- “Which files look risky?”
- “Which areas lack tests?”
- “What changed files need QA attention?”

Rules:

- Use `qa-context/repo-risk.md`.
- Do not recalculate churn or coverage manually unless data is missing.
- Do not confuse technical risk with business priority.
- Mention limitations.

## Skill: qa-unknowns

Purpose:

Prevent the agent from guessing.

Use cases:

- “How do I get a QA build?”
- “Can we release this?”
- “Which environment should I test on?”
- “Who approves this?”

Rules:

- Check `qa-context/unknowns.md`.
- If required knowledge is unknown, say so.
- Suggest the exact question to ask a human.

## Skill: qa-refresh

Purpose:

Help the user refresh QA context.

Rules:

- Manual invocation only.
- Prefer deterministic CLI command.
- Do not auto-run expensive scans.
- Do not write to external systems.

Suggested command:

```bash
qa-boot refresh
```

## Skill: qa-release-readiness

Purpose:

Draft release readiness guidance based on known facts.

Rules:

- Use known CI/test/release facts.
- Mention unknown release blockers.
- Do not approve release.
- Do not invent release gates.

## Skill: qa-pr-risk

Purpose:

Review changed files from a QA/risk perspective.

Rules:

- Use QA Radar diff data if available.
- Use product-risk map if available.
- Mention missing business priority.
- Suggest tests/manual checks.
- Do not post comments externally in v1.

## Manual-only actions

These should remain manual-only in V1:

- posting comments to GitHub/GitLab PRs,
- creating or updating Jira/Linear tickets,
- updating TestRail/Xray/Zephyr,
- writing to Notion/Confluence/Google Docs,
- triggering CI pipelines,
- triggering deployment or release jobs,
- changing branch protection rules,
- editing production config,
- accessing secrets or credentials,
- pulling production customer data,
- marking a release as approved,
- sending Slack/Teams messages,
- opening PRs automatically,
- deleting or rewriting tests in bulk.

## Portability note

V1 should optimize for Claude Code output.

Future versions may generate:

- `AGENTS.md`,
- Cursor rules,
- Codex-compatible instructions,
- generic Markdown context packs.
