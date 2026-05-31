# 06 — QA Radar Adapter

## Purpose

QA Radar should be the first external deterministic evidence provider supported by QA Boot.

QA Radar provides repo-level quality risk signals.

It helps answer:

```text
Which parts of this repo look risky from a testing perspective?
```

QA Boot uses those results as evidence and places them into broader QA/project/org context.

## Relationship

```text
QA Radar = technical repo-risk intelligence.
QA Boot = QA/org context bootloader for AI agents.
```

QA Radar tells the agent where the code risk is.

QA Boot tells the agent:

- what is known,
- what is unknown,
- what is business-critical,
- what is allowed,
- what must be confirmed.

## What QA Radar contributes

QA Radar can contribute:

- git churn signals,
- coverage gaps,
- test-to-source mapping,
- untested files,
- risk-ranked modules,
- PR/diff-aware file risk.

## What QA Radar does not know

QA Radar does not know by itself:

- business priority,
- customer impact,
- release criticality,
- team ownership,
- approval process,
- environment trust,
- automation receptivity,
- whether a high-risk file matters to the current release.

QA Boot must not confuse QA Radar technical risk with total QA priority.

## V1 integration posture

In V1 the adapter is built against a **pinned JSON contract and a committed
fixture**, with a **stub provider** standing in for a live QA Radar. Real wiring
(spawning `qaradar` or calling its MCP) is deferred — the contract below is the
seam so the swap is drop-in.

- The adapter consumes a JSON document matching the schema below.
- A fixture lives in the sample org / test corpus and exercises the full
  normalize → `repo-risk.md` → unknowns path without needing QA Radar installed.
- `isAvailable()` returns false when no real QA Radar is found; V1 then either
  uses the stub (in demo/test) or skips QA Radar and records the gap as an
  unknown.

## Expected JSON contract

QA Boot reads this shape (fields it does not recognize are ignored):

```json
{
  "schema_version": "1",
  "tool": "qaradar",
  "command": "qaradar analyze . --json-output",
  "generated_at": "2026-05-30T12:00:00Z",
  "base": "origin/main",
  "risky_modules": [
    {
      "path": "src/payments/core.py",
      "risk": "critical",
      "churn": 0.91,
      "coverage": 0.0,
      "has_tests": false,
      "recently_modified": true
    }
  ],
  "untested_files": ["src/payments/core.py"],
  "coverage_gaps": [
    { "path": "src/auth/tokens.py", "coverage": 0.12 }
  ],
  "summary": {
    "critical_count": 3,
    "high_count": 7
  }
}
```

`risk` is one of `critical | high | medium | low`. Counts in `summary` are the
authoritative totals used in the `repo-risk.high-churn-untested-files` fact.

## Example commands

```bash
qaradar analyze . --json-output
```

PR/diff mode:

```bash
qaradar analyze . --base origin/main --json-output
```

QA Boot wrapper:

```bash
qa-boot scan --with-qaradar
qa-boot scan --with-qaradar --base origin/main
```

## Generated file

QA Boot should generate:

```text
qa-context/repo-risk.md
```

Example content:

```md
# Repository Risk Summary

Generated from deterministic repo analysis.

## Highest-risk areas

1. `src/payments/core.py`
   - High churn
   - No detected tests
   - Recently modified

2. `src/auth/tokens.py`
   - Low coverage
   - Active recently

## Important limitation

This is a technical risk view. It does not know business priority, customer impact, ownership, or release criticality unless those facts are captured elsewhere in QA context.
```

## Example fact

```json
{
  "id": "repo-risk.high-churn-untested-files",
  "domain": "repo_quality",
  "statement": "Several high-churn files have no detected tests.",
  "value": {
    "critical_count": 3,
    "high_count": 7
  },
  "provenance": "observed",
  "confidence": 0.82,
  "evidence_provider": "qaradar",
  "evidence_command": "qaradar analyze . --json-output",
  "evidence": [
    "git history",
    "coverage report",
    "test-to-source mapping"
  ],
  "limitations": [
    "Business criticality is unknown",
    "Risk is based on repository signals, not production impact"
  ],
  "risk_if_wrong": "The agent may prioritize tests for technically risky files that are not the most business-critical areas.",
  "needs_human_confirmation": false,
  "last_verified": "2026-05-30"
}
```

## Integration rules

QA Boot should:

- detect whether QA Radar is available,
- offer to run it,
- parse JSON output,
- normalize findings into facts,
- generate `repo-risk.md`,
- update `maturity.md`,
- add unknowns where repo risk lacks business context.

QA Boot should not:

- rebuild QA Radar internally,
- replace QA Radar’s algorithm,
- require QA Radar for basic use,
- auto-post QA Radar results to PRs,
- auto-open tickets from QA Radar findings,
- treat QA Radar as business priority truth.

## Unknowns generated from QA Radar

When QA Radar identifies technical risk but business context is missing, QA Boot should create unknowns such as:

```md
## Unknowns from repo-risk analysis

- `src/payments/core.py` is technically high-risk, but business criticality is unknown.
- Several files have no detected tests, but ownership is unknown.
- Coverage exists, but it is unclear whether the team trusts it.
- PR risk can be calculated, but release-blocking rules are unknown.
```

## Claude guidance

Generated Claude context should include:

```md
## Repo risk guidance

When asked what to test first, check `qa-context/repo-risk.md` before giving generic advice.

Repo risk findings are technical evidence, not full business priority.

Do not assume a high-risk file is business-critical unless business impact is documented in `qa-context/product-risk-map.md` or confirmed by a human.

When QA Radar data is missing or incomplete, say so clearly.
```
