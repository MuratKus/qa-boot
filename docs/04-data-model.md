# 04 — Data Model

## Core object: Fact

The fact store is the core of QA Boot.

Every important finding should become a structured fact.

## Fact schema

```json
{
  "id": "build.android.qa",
  "domain": "build",
  "statement": "Android QA build process was not found.",
  "value": null,
  "provenance": "unknown",
  "confidence": 0.0,
  "evidence_provider": "built-in-build-scanner",
  "evidence_command": "qa-boot scan",
  "evidence": [],
  "limitations": [],
  "risk_if_wrong": "Agent may invent wrong build instructions or guide QA to the wrong artifact.",
  "needs_human_confirmation": true,
  "last_verified": "2026-05-30",
  "expires_after_days": 30
}
```

## Provenance types

### observed

The tool directly detected the fact.

Example:

```text
Playwright config found at playwright.config.ts.
```

### inferred

The tool made a cautious inference.

Example:

```text
No release gate was found in CI config. Release gating may happen elsewhere.
```

### told

A human provided the fact.

Example:

```text
The staging environment is unstable after Monday data refresh.
```

### unknown

The tool could not find or verify the information.

Example:

```text
QA build generation process is unknown.
```

## Confidence scale

Confidence should be practical, not fake precision.

```text
0.0 = unknown
0.2 = weak inference
0.5 = plausible but needs confirmation
0.8 = observed with strong evidence
1.0 = directly verified and current
```

Confidence should never replace provenance.

## Fact store lifecycle (V1)

`facts.json` persists across runs. It is **upsert-by-id**, not regenerated from
scratch. In V1 all facts are deterministic (`observed`, `inferred`, or
`unknown`); `told` facts arrive in V1.5 (ADR 0005), so there is no
human-vs-scan conflict to resolve yet.

### Fact id

- Single repo: `<domain>.<subject>[.<qualifier>]` — e.g. `build.android.qa`.
- Workspace: ids are repo-scoped with a `<repo>:` prefix —
  e.g. `mobile-app:build.android.qa`. Cross-system facts use the reserved
  prefix `cross-system:` — e.g. `cross-system:api-contract.coverage`.
- A fact id is stable: the same finding must always produce the same id so it
  can be upserted across runs.

### Merge algorithm

On each `scan`/`refresh`, for the set of facts a provider emits this run:

1. **New id** (not in store) → insert. Set `last_verified` to today.
2. **Existing id, still emitted** → upsert: replace `value`, `confidence`,
   `evidence`, `limitations`, `statement`; set `last_verified` to today; clear
   any `stale` flag.
3. **Existing id, no longer emitted** by a provider that previously emitted it →
   **mark stale** (do not delete): set `stale: true` and
   `stale_reason: "no longer detected"`, keep `last_verified` unchanged. Stale
   facts are retained one cycle and surfaced in `status`; if still absent on the
   next run they may be dropped.
4. **Time-based staleness** → any fact where
   `today - last_verified > expires_after_days` is marked `stale: true`,
   `stale_reason: "expired"`, regardless of whether it was re-emitted.

`refresh` runs the same algorithm and additionally prints a **diff summary**:
facts added, updated, newly stale, and dropped.

> V1.5 will extend step 2 to never silently overwrite `told` facts — those will
> require review before replacement. The store interface is built id-keyed so
> this is additive.

## Domains

Suggested fact domains:

```text
repo
test
build
ci
release
environment
test_data
repo_quality
business_priority
ownership
knowledge_sources
agent_permissions
maturity
receptivity
unknowns
```

## Unknowns model

Unknowns should be generated when important knowledge is missing.

Required unknown categories:

```text
build
ci
release
environments
test_data
ownership
business_priority
knowledge_sources
agent_permissions
test_trust
coverage_trust
flake_management
manual_regression
a_b_testing
observability
incident_feedback
```

## Example unknowns file

```md
# Unknowns

## Build

- QA build generation process was not found.
- Artifact storage location is unknown.

## CI and release

- It is unclear which CI jobs block release.
- Release approval process was not found.

## Environment

- Stability of staging environment is unknown.
- Test data reset process is unknown.

## Business context

- Business criticality of high-risk repo areas is unknown.
- A/B testing decision source is unknown.

## Agent permissions

- It is unknown whether an AI agent may comment on PRs.
- It is unknown whether an AI agent may trigger CI jobs.
```

## Unknowns as onboarding questions

Each unknown should map to a human question.

Example:

```text
Unknown:
QA build generation process was not found.

Question:
Who or what system produces QA builds, where are artifacts stored, and who owns that workflow?
```

## Maturity model

Maturity should be descriptive and rankable.

Scores are useful only if they change recommendations.

### Dimensions

1. Discoverability
2. Test signal
3. Trust
4. Release readiness
5. Quality ownership
6. Agent readiness

### Scale

```text
0 = Unknown
1 = Missing / weak
2 = Present but unreliable
3 = Usable
4 = Strong
5 = Excellent / mature
```

Each score must include:

- explanation,
- evidence,
- unknowns,
- recommended next step.

### Deterministic rubric (V1)

Scores are computed by the CLI from fact signals — no AI agent (ADR 0001/0005).
Each dimension sums boolean/threshold signals into a 0–5 band. A dimension with
no usable signal scores `0` (Unknown). Any AI synthesis appears only in the
generated Claude skill prose, never in the number.

| Dimension | Signals (each contributes) | Band |
|---|---|---|
| **Discoverability** | README present; build file detected; CI config detected; docs dir / onboarding doc present; agent config (`CLAUDE.md`/`AGENTS.md`) present | 0 = none · 1 = README only · 3 = README+build+CI · 5 = all incl. docs+agent config |
| **Test signal** | test dir/framework detected; CI runs tests; coverage artifact present; QA Radar untested-critical count low | 0 = no tests · 2 = tests exist, no CI/coverage · 3 = tests run in CI · 5 = run in CI + coverage + low untested-critical |
| **Trust** | coverage freshness known; QA Radar high-risk files mapped to tests; flake handling detected | 0 = unknown · 2 = coverage exists, freshness unknown · 5 = fresh coverage + risk mapped to tests (capped at 2 in V1 if freshness unknown — usually unknown) |
| **Release readiness** | release/deploy jobs detected; release-blocking rule detected; release docs present | 0 = none · 1 = deploy job only · 3 = release job + docs · 5 = explicit blocking gates documented |
| **Quality ownership** | CODEOWNERS present; PR template present; bug template present; ownership facts known | 0 = none · 2 = one of them · 3 = CODEOWNERS + a template · 5 = ownership facts explicit (rare in V1 — usually capped low) |
| **Agent readiness** | agent config present; `.claude/` present; existing skills/MCP detected; explicit agent-permission facts known | 0 = none · 2 = agent config present · 3 = `.claude/` + skills · 5 = permission boundaries explicit (told — V1.5+, so usually capped low in V1) |

Notes:

- Dimensions that depend on `told` knowledge (Trust freshness, Quality
  ownership specifics, Agent permission boundaries) are usually capped low in V1
  because that knowledge is unknown until V1.5 Coach Mode. That is honest, not a
  bug: the rubric reports low + the exact unknown + the question to ask.
- Every score line lists the evidence facts it counted and the unknowns that
  held it back.

Example:

```md
## Test Signal: 2/5

Tests exist and CI appears to run them, but coverage freshness is unknown and QA Radar detected several high-churn files without mapped tests.

Evidence:
- `playwright.config.ts`
- `.github/workflows/test.yml`
- `qa-context/repo-risk.md`

Next step:
Confirm whether CI test failures block merges and whether coverage reports are current.
```

## Receptivity and permission model

The receptivity layer should only exist if it changes concrete output.

### Autonomy ceiling

```text
0 = Read context only
1 = Suggest actions only
2 = Generate local files only
3 = Open PRs with human approval
4 = Comment on PRs with approval
5 = Update external tools with approval
```

V1 default:

```text
1 = Suggest actions only
```

### Action permission matrix

| Action | V1 Default |
|---|---|
| Read repo files | Allowed |
| Read generated QA context | Allowed |
| Run deterministic local scan | Manual |
| Generate local context files | Allowed after user command |
| Update QA context files | Allowed after user command |
| Comment on PR | Manual-only / out of scope |
| Open PR | Manual-only / out of scope |
| Trigger CI | Manual-only / out of scope |
| Create Jira ticket | Manual-only / out of scope |
| Update TestRail | Manual-only / out of scope |
| Write to Notion/Confluence | Manual-only / out of scope |
| Access secrets | Never |
| Approve release | Never |
| Deploy | Never |
