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

## Integration posture (implemented in V0)

> **Status:** As of V0 the adapter is **wired live**. QA Boot spawns the real
> `qaradar` CLI as a subprocess and normalizes its JSON output. The earlier
> "stub provider against a guessed contract" plan was dropped once we confirmed
> `qaradar` is a real, installed CLI (see ADR 0003 and the V0 design spec).

- The provider (`src/providers/qaradar-provider.ts`) implements
  `EvidenceProvider`. `isAvailable()` returns false when `qaradar` is not on
  PATH or the config disables it; otherwise it probes `qaradar --version`.
- `collect()` runs `qaradar analyze <repoPath> --json-output --days <n> --top <n>`
  and parses stdout. Any failure (non-zero exit, empty stdout, unparseable JSON)
  returns `[]` — the scan never throws on the optional provider.
- The pure parse step lives in `src/providers/qaradar-parse.ts` and is unit-tested
  against a committed fixture (`fixtures/qaradar/sample.json`) so tests run without
  the binary; a separate integration test spawns the real CLI and is skipped when
  `qaradar` is absent.
- When QA Radar does not run, QA Boot records the gap as a deterministic unknown
  fact (`repo_quality.risk-analysis`), suppressed when QA Radar did run.

Deferred to a later version: consuming diff-aware `--base` mode (contract verified
below, but qa-boot does not parse it yet), and calling QA Radar via its MCP server
instead of the CLI.

## JSON contract (verified against the real tool)

QA Boot reads the shape emitted by `qaradar analyze --json-output`. Fields it
does not recognize are ignored, so future qaradar additions won't break parsing.
The TypeScript types are in `src/providers/qaradar-contract.ts`.

```json
{
  "summary": {
    "repo": "qaradar",
    "analyzed_at": "2026-06-02T08:10:26Z",
    "source_files": 14,
    "test_files": 14,
    "test_to_source_ratio": 1.0,
    "avg_coverage": null,
    "files_with_tests": 11,
    "files_without_tests": 3,
    "critical_risk_count": 0,
    "high_risk_count": 3,
    "coverage_status": "no_report_found"
  },
  "risky_modules": [
    {
      "path": "qaradar/models.py",
      "risk_level": "high",
      "risk_score": 0.681,
      "reasons": ["No coverage data available", "No test files found for this source file"]
    }
  ],
  "untested_files": ["qaradar/models.py"],
  "high_churn": [
    { "path": "qaradar/cli.py", "commits": 9 }
  ]
}
```

`risk_level` is one of `critical | high | medium | low`; `risk_score` is `0.0–1.0`.
`coverage_status` is `ok | no_report_found`. The `summary.critical_risk_count` and
`summary.high_risk_count` totals are the authoritative counts surfaced in the
`repo_quality.high-churn-untested` fact.

> Note: top-level QA Radar output uses `high_churn` (commit-count entries), not a
> `coverage_gaps` array. An earlier draft of this doc guessed a different shape
> (`schema_version`/`risk`/`churn`/`coverage_gaps`); that guess predated the tool
> and has been corrected here.

## Diff-mode JSON contract (verified, not yet consumed)

`qaradar analyze <path> --base <ref> --json-output` emits a **different** top-level
shape than full mode — it is not a filtered `QaradarReport`. Verified against
qaradar 0.4.0 on 2026-06-10 (an earlier `PrRiskReport` guess in this doc's history
predated the tool). qa-boot does not parse this yet; when a PR-risk feature lands
it needs its own contract type and parser — `parseQaradar` cannot consume it.

```json
{
  "summary": {
    "repo": "C:\\path\\to\\repo",
    "analyzed_at": "2026-06-10T11:05:08+03:00",
    "base_ref": "HEAD~5",
    "head_ref": "HEAD",
    "total_changed_files": 45,
    "changed_source_files": 22,
    "critical_count": 0,
    "high_count": 8,
    "medium_count": 13,
    "low_count": 1,
    "high_plus_count": 8,
    "files_without_tests": 6,
    "status": "ok"
  },
  "headline": "8 of 22 changed source files are HIGH+ risk",
  "risky_changed_files": [
    {
      "file": "qaradar/cli.py",
      "risk": "HIGH",
      "score": 0.676,
      "churn_score": 0.89,
      "coverage_score": 0.7,
      "test_mapping_score": 0.4,
      "reasons": ["High churn: 10 commits, 399 lines changed", "No coverage data available"]
    }
  ],
  "changed_files_without_tests": ["lib/untested.dart"],
  "changed_test_files": ["tests/calculator_test.dart"],
  "changed_untracked_by_analyzers": [".gitignore"]
}
```

Contract differences from full mode worth remembering:

- per-file entries use `file` (not `path`) and UPPERCASE `risk` (`"HIGH"`, not `"high"`);
- per-file entries carry component sub-scores (`churn_score`, `coverage_score`,
  `test_mapping_score`) that full mode does not expose;
- `headline` is a ready-made one-line summary string;
- summary counts are diff-scoped (`total_changed_files`, `changed_source_files`,
  `high_plus_count`) and include `base_ref`/`head_ref`.

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

It is written only when QA Radar ran (a `repo_quality` fact exists); otherwise the
file is skipped and the gap is recorded as an unknown. Actual output shape
(`src/generate/special-renderers.ts → renderRepoRisk`):

```md
# Repository Risk Summary

Generated from deterministic repo analysis (QA Radar).

Critical: 0 · High: 5

## Highest-risk areas

1. `qaradar/models.py` (high)
   - No coverage data available
   - No test files found for this source file
2. `qaradar/cli.py` (high)
   - High churn: 9 commits, 297 lines changed
   - No coverage data available

## Important limitation

This is a technical risk view. It does not know business priority, customer impact, ownership, or release criticality unless captured elsewhere in QA context.
```

## Example fact

The normalizer (`src/domains/repo-quality-facts.ts`) emits one observed fact whose
`value` carries the summary counts plus the top-risk modules (top 5 by score):

```json
{
  "id": "repo_quality.high-churn-untested",
  "domain": "repo_quality",
  "statement": "QA Radar flagged high-risk and/or untested files.",
  "value": {
    "critical_count": 0,
    "high_count": 3,
    "files_without_tests": 3,
    "coverage_status": "no_report_found",
    "top_risky": [
      { "path": "qaradar/models.py", "risk": "high", "score": 0.681, "reasons": ["No coverage data available"] }
    ],
    "untested_files": ["qaradar/models.py"]
  },
  "provenance": "observed",
  "confidence": 0.82,
  "evidence_provider": "qaradar",
  "evidence_command": "qaradar analyze . --json-output",
  "evidence": ["git history", "test-to-source mapping", "no coverage report"],
  "limitations": [
    "Business criticality is unknown.",
    "Risk is based on repository signals, not production impact."
  ],
  "risk_if_wrong": "The agent may prioritize technically risky files that are not the most business-critical.",
  "needs_human_confirmation": false,
  "last_verified": "2026-06-02",
  "expires_after_days": 30
}
```

## Integration rules

QA Boot should:

- detect whether QA Radar is available (`qaradar` on PATH),
- run it during `scan` when enabled,
- parse JSON output,
- normalize findings into facts,
- generate `repo-risk.md` when a `repo_quality` fact exists,
- add unknowns where repo risk lacks business context.

> Note: V0 does **not** feed QA Radar output into the maturity rubric — the
> deterministic rubric (`src/maturity/rubric.ts`) scores from test/CI/docs
> signals only. Wiring repo-risk into the Test-signal/Trust dimensions is a
> possible later refinement, not current behavior.

QA Boot should not:

- rebuild QA Radar internally,
- replace QA Radar’s algorithm,
- require QA Radar for basic use,
- auto-post QA Radar results to PRs,
- auto-open tickets from QA Radar findings,
- treat QA Radar as business priority truth.

## Unknowns generated from QA Radar

V0 emits two deterministic unknown facts around repo risk (it does not yet emit
per-file unknowns):

- **When QA Radar ran** (`repo_quality.high-churn-untested` exists), the
  `repo-quality-facts` normalizer adds `business_priority.vs-repo-risk` —
  "Repo risk is known technically, but business criticality of those files is
  unknown." with the question *"Which of the technically risky files are
  business-critical or customer-facing?"*
- **When QA Radar did not run**, the unknowns generator
  (`src/unknowns/unknowns.ts`) emits `repo_quality.risk-analysis` — the gap that
  no deterministic repo-risk analysis was available — suppressed once QA Radar
  does run.

Per-file business-context unknowns (e.g. "`path` is high-risk but its business
criticality is unknown") are a possible later enhancement, not current behavior.

## Claude guidance

Generated Claude context should include:

```md
## Repo risk guidance

When asked what to test first, check `qa-context/repo-risk.md` before giving generic advice.

Repo risk findings are technical evidence, not full business priority.

Do not assume a high-risk file is business-critical unless business impact is documented in `qa-context/product-risk-map.md` or confirmed by a human.

When QA Radar data is missing or incomplete, say so clearly.
```
