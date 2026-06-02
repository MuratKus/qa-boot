# QA Boot V0 — Design Spec

Date: 2026-06-02
Status: Approved (pre-implementation)
Related specs: `docs/02-v1-scope.md`, `docs/03-architecture.md`, `docs/04-data-model.md`,
`docs/05-evidence-providers.md`, `docs/06-qa-radar-adapter.md`, `docs/07-claude-code-output.md`,
`docs/08-cli-behavior.md`, `docs/10-roadmap.md`. ADRs: 0001–0005.

## Goal

Deliver the V0 prototype from the roadmap: scan one repository, write a structured
fact store, and generate useful Claude Code QA context. V0 is a thin but
architecturally honest slice of V1 — the code carries forward without a rewrite.

## Scope

### In scope

- `qa-boot init`, `qa-boot scan`, `qa-boot generate`
- 6 deterministic built-in scanners: repo/languages, test, ci, docs, build/release,
  agent-config
- **Live** QA Radar evidence provider — spawns the installed `qaradar analyze
  --json-output` CLI as a subprocess and normalizes its output (ADR 0003)
- Fact store: `qa-context/facts.json`, upsert-by-id, time-based staleness
- Deterministic 6-dimension maturity rubric (doc 04)
- Unknowns generation with the exact human question per unknown
- Generated outputs: the `qa-context/*.md` domain summaries, `unknowns.md`,
  `repo-risk.md` (when QA Radar ran), `CLAUDE.qa.md`, and 4 skills
  (`qa-context`, `qa-unknowns`, `qa-risk`, `qa-release-readiness`)

### Out of scope (deferred to V1+)

- QA Radar **diff-aware mode** (`--base`) — V0 wires full-repo `analyze` only; the
  PR-risk JSON shape (`PrRiskReport`) is a V1 add
- Calling QA Radar via its **MCP** server — V0 uses the deterministic CLI path only
  (the CLI must not depend on an agent, per doc 08)
- Workspace mode and all `workspace *` commands
- `qa-boot refresh` and `qa-boot status` (and the refresh diff summary)
- The "no longer emitted → mark stale" merge rule (V0 keeps only time-based staleness)
- `told` facts and `qa-boot facts add`
- The other 2 skills (`qa-pr-risk`, `qa-refresh`)
- `--base` / diff-aware risk, workspace flags

## Architecture (Approach A′)

Vertical domain slices. Detection is separated from fact-shaping for clean test
boundaries, but fact-shaping stays domain-local — only the fact factory and the
store are centralized (the two things that must stay uniform across domains).

```
src/
  cli/
    index.ts                  # arg parsing + command dispatch
    commands/{init,scan,generate}.ts
  config/
    config.ts                 # load/validate qa-boot.config.json, defaults
  core/
    fact.ts                   # Fact type + makeFact() factory
    fact-store.ts             # load/save facts.json, upsert-by-id merge
    scan-context.ts           # { repoPath, config, fileIndex }
    fs-utils.ts               # safe read, glob, exists, JSON read
  scanners/                   # PURE detectors: (ScanContext) -> RawEvidence[]
    repo-scanner.ts  test-scanner.ts  ci-scanner.ts
    docs-scanner.ts  build-scanner.ts  agent-config-scanner.ts
  domains/                    # per-domain fact mappers: (RawEvidence[]) -> Fact[]
    repo-facts.ts  test-facts.ts  ci-facts.ts
    docs-facts.ts  build-facts.ts  agent-facts.ts  repo-quality-facts.ts
  providers/
    evidence-provider.ts      # EvidenceProvider interface (doc 05)
    qaradar-provider.ts       # isAvailable() = qaradar on PATH; collect() spawns the CLI
    qaradar-contract.ts       # types for the REAL qaradar --json-output shape
    qaradar-parse.ts          # pure: raw JSON -> EvidenceResult[] (unit-tested vs fixture)
  unknowns/
    unknowns.ts               # derive unknown facts from absent signals
  maturity/
    rubric.ts                 # deterministic 6-dimension rubric (doc 04)
  generate/
    renderers/*.ts            # one renderer per output file: (Fact[]) -> string
    claude-qa.ts  skills.ts
    generate.ts               # orchestrates renderers + writes files
  templates/                  # skill SKILL.md templates
fixtures/
  qaradar/sample.json         # committed QA Radar contract fixture
test-fixtures/repos/          # tiny sample repos for scanner tests
```

The qaradar provider is the only thing implementing `EvidenceProvider`. Built-in
scanners stay pure functions (no over-abstraction).

## Data flow

```
scan:
  ScanContext → [6 scanners] → RawEvidence[]
              → [6 domain mappers] → Fact[]
  qaradar provider (if enabled & available)
              → EvidenceResult[] → repo-quality-facts → Fact[]
              → unknowns.ts adds unknown-facts for absent signals
              → FactStore.upsert → facts.json
              → (auto) generate unless --no-generate

generate:
  facts.json → [renderers] → qa-context/*.md + CLAUDE.qa.md + .claude/skills/**/SKILL.md
```

## Data model

### Fact (V0 subset of doc 04)

```ts
interface Fact {
  id: string;                 // "<domain>.<subject>[.<qualifier>]", stable across runs
  domain: string;
  statement: string;
  value: unknown | null;
  provenance: "observed" | "inferred" | "unknown";   // no "told" in V0
  confidence: number;         // 0.0–1.0 per doc 04 scale
  evidence_provider: string;
  evidence_command: string;   // e.g. "qa-boot scan"
  evidence: string[];         // file paths / sources
  limitations: string[];
  risk_if_wrong: string;
  needs_human_confirmation: boolean;
  last_verified: string;      // ISO date
  expires_after_days: number; // default 30
  stale?: boolean;
  stale_reason?: string;
}
```

`makeFact()` stamps `last_verified`, `evidence_command`, `expires_after_days`, and
default confidence/provenance, so domain mappers supply only domain-specific fields.

### FactStore merge (V0)

Upsert-by-id, persisted in `qa-context/facts.json`:

1. New id → insert; `last_verified = today`.
2. Existing id, re-emitted → replace `value`/`confidence`/`evidence`/`limitations`/
   `statement`; `last_verified = today`; clear any `stale` flag.
3. Time-based staleness → any fact with `today - last_verified > expires_after_days`
   is marked `stale: true`, `stale_reason: "expired"`.

The "existing id no longer emitted → mark stale" rule and the `refresh` diff are
deferred to V1 (no `refresh` command in V0). The store is id-keyed so V1's
told-fact preservation and stale-on-drop layer on additively.

### Confidence convention

- Direct config-file hit → `0.8` (observed)
- Dep-only / name-heuristic → `0.5` (inferred)
- Absent → unknown fact at `0.0`

### Unknowns

`unknowns.ts` emits `provenance: "unknown"`, `confidence: 0` facts for absent
signals, covering doc 04's categories. Domains that are always unknown in V0
(no told facts): build artifact/QA-build process, release gates, environments,
test_data, ownership specifics, business_priority, agent_permissions, test_trust.
Each unknown fact carries the exact human question so renderers print
"Ask a human: …".

### Maturity

`rubric.ts` is a pure function `(Fact[]) → MaturityScore[]` implementing the doc 04
deterministic rubric across 6 dimensions (Discoverability, Test signal, Trust,
Release readiness, Quality ownership, Agent readiness). Each score includes
explanation, evidence facts counted, unknowns that held it back, and a next step.
No AI in the number. Trust / Quality ownership / Agent readiness usually cap low
in V0 because they depend on told knowledge — this is honest, reported with the
exact unknown.

## Scanners (detection rules)

File-presence + shallow content parsing only. No AST, no network. Each returns
`RawEvidence[]` (`{ kind, path, detail }`).

| Scanner | Detects via |
|---|---|
| repo | `package.json`/`pyproject.toml`/`go.mod`/`pom.xml`/`build.gradle*`/`Cargo.toml`/`Gemfile` → languages + package managers; framework hints from `package.json` deps; `Dockerfile`, `Makefile`, monorepo markers (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`); `README*` |
| test | dirs (`test/`,`tests/`,`__tests__/`,`spec/`,`e2e/`); config files (`playwright.config.*`,`cypress.config.*`,`jest.config.*`,`vitest.config.*`,`pytest.ini`/`tox.ini`, JUnit/gradle test deps); deps in `package.json`; → frameworks + unit/integration/e2e hints + coverage tool presence (`nyc`,`coverage`,`jacoco`) |
| ci | `.github/workflows/*.y*ml`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`, `.buildkite/`, `bitbucket-pipelines.yml`; shallow-parse YAML for job names hinting test/build/deploy/release |
| docs | `README*`, `CONTRIBUTING*`, `docs/`, `CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE*`, `.github/ISSUE_TEMPLATE*`, ADR dirs, `CHANGELOG*` |
| build | `Makefile`/`Dockerfile`/`docker-compose*`, npm `scripts` (build/start/test), `Fastlane/`, gradle tasks — flags what's present; QA-build/artifact/deploy specifics emit as unknown when not clearly found |
| agent-config | `CLAUDE.md`, `AGENTS.md`, `.claude/` (skills/hooks/mcp), `.cursor/`/`.cursorrules` |

## QA Radar (live provider)

QA Radar is a real installed CLI (`qaradar`, a Python package; source at
`../qaradar`). V0 wires it live as a subprocess (ADR 0003: consume its output,
do not rebuild it). The doc 06 "pinned contract" was written before the tool
existed and **does not match reality** — we pin against the verified shape below.
(Follow-up: doc 06 should be corrected to this contract; tracked separately.)

### Verified contract (`qaradar analyze <path> --json-output`)

```json
{
  "summary": {
    "repo": "...", "analyzed_at": "ISO-8601",
    "source_files": 14, "test_files": 14, "test_to_source_ratio": 1.0,
    "avg_coverage": null,
    "files_with_tests": 11, "files_without_tests": 3,
    "critical_risk_count": 0, "high_risk_count": 3,
    "coverage_status": "ok | no_report_found"
  },
  "risky_modules": [
    { "path": "...", "risk_level": "critical|high|medium|low",
      "risk_score": 0.681, "reasons": ["..."] }
  ],
  "untested_files": ["..."],
  "high_churn": [ { "path": "...", "commits": 9 } ]
}
```

Unrecognized fields are ignored, so future qaradar additions won't break parsing.

### Provider

- `qaradar-contract.ts`: TypeScript types for the shape above.
- `qaradar-provider.ts`:
  - `isAvailable()` → `qaradar` resolvable on PATH (when `qaradar.enabled` is
    `auto` or `true`; `false` short-circuits to not-available).
  - `collect()` → spawn `qaradar analyze <repoPath> --json-output` (with `--days`
    and `--top` from config defaults), capture stdout, `JSON.parse`, hand to
    `qaradar-parse.ts`. Non-zero exit / unparseable output → treated as
    unavailable (logged), never throws into the scan.
- `qaradar-parse.ts` (pure, unit-tested vs committed fixture): raw JSON →
  `EvidenceResult[]`.
- `repo-quality-facts.ts`: normalizes into the `repo_quality.high-churn-untested`
  fact (provenance `observed`, value = the summary counts + top risky modules),
  plus QA-Radar-derived unknowns (technical risk present but business priority /
  ownership / release rules unknown — doc 06).

### Graceful degradation

`qaradar.enabled` is `auto | true | false`. When enabled but `qaradar` is not on
PATH (or the run fails): print `QA Radar not available. Continuing with built-in
scanners.`, record the gap as an unknown, continue — the scan never fails on the
optional provider.

## Generated outputs

All rendered from `facts.json`, fully overwritten each `generate`, never hand-edited.

```
qa-context/
  README.md            (written by init; explains the dir is tool-owned)
  facts.json           (source of truth; written by scan)
  unknowns.md          all unknown facts grouped by domain + "Ask a human" questions
  test-stack.md        repo-risk.md      maturity.md
  build-and-run.md     ci-and-release.md knowledge-sources.md
  environments.md      test-data.md      product-risk-map.md
  quality-risks.md     refresh-policy.md
CLAUDE.qa.md
.claude/skills/
  qa-context/SKILL.md  qa-unknowns/SKILL.md
  qa-risk/SKILL.md     qa-release-readiness/SKILL.md
qa-boot.config.json    (written by init)
```

- Domain summaries use doc 07's Known / Unknown shape. All-unknown domains render
  the first-class "everything unknown" form, not a blank file.
- `repo-risk.md` renders only when a `repo_quality` fact exists (QA Radar ran);
  otherwise it is skipped and the gap appears as an unknown.
- `CLAUDE.qa.md` points Claude at `qa-context/`, forbids assuming missing
  build/release/environment/ownership knowledge, and separates technical repo risk
  from business priority (doc 07).

## CLI

| Command | Behavior |
|---|---|
| `qa-boot init` | Minimal prompts (project name; claude on/off; qaradar auto/off). Writes `qa-boot.config.json` + `qa-context/README.md`. Idempotent; won't clobber an existing config without `--force`. |
| `qa-boot scan` | Run scanners → qaradar provider (if enabled/available) → unknowns → upsert `facts.json` → auto-run `generate` unless `--no-generate`. |
| `qa-boot generate` | Render all outputs from `facts.json`. Errors clearly if `facts.json` is missing. |

Flags (V0): `--with-qaradar`, `--skip-qaradar`, `--no-generate`, `--no-claude`,
`--output <dir>`, `--dry-run`. (`--base`, workspace, `refresh`, `status` deferred.)

### Config shape

Doc 08 example, minus workspace nuance; keeps `refresh.default_days: 30` since
staleness uses it.

```json
{
  "project_name": "example-service",
  "mode": "single-repo",
  "claude": { "enabled": true, "generate_skills": true },
  "evidence_providers": {
    "qaradar": { "enabled": "auto", "days": 90, "top": 20 }
  },
  "refresh": { "default_days": 30 }
}
```

## Error handling

- Unreadable/locked files → skip with a warning; never crash a scan.
- Failed required write → clear message (e.g. "Could not write qa-context/facts.json.
  Check file permissions.").
- Optional provider failure → continue with built-in scanners.

## Testing

- TDD throughout. **Vitest** runner.
- Scanners: unit tests against tiny committed sample repos in `test-fixtures/repos/`
  (node+playwright+gha; python+pytest; bare/empty repo). Assert `RawEvidence[]`.
- Domain mappers / unknowns / rubric / renderers: pure-function tests with
  hand-built `Fact[]` / evidence inputs — no filesystem. (The payoff of A′.)
- FactStore: upsert/merge + time-staleness unit tests.
- qaradar parse/normalize: pure tests against committed `fixtures/qaradar/sample.json`
  (captured from real `qaradar analyze --json-output`); plus an "absent" case →
  graceful unknown. Live subprocess spawn covered by one integration test that is
  **skipped when `qaradar` is not on PATH** (never spawns in unit runs).
- CLI smoke: run `init`/`scan`/`generate` against a fixture repo in a temp dir;
  assert files exist + key content.

## Acceptance criteria (V0)

1. `qa-boot init` writes config + `qa-context/README.md`, idempotently.
2. `qa-boot scan` on a real repo detects languages, tests, CI, docs, build signals,
   agent config, and writes a valid `facts.json`.
3. `scan` auto-runs `generate`; `--no-generate` writes only `facts.json`.
4. `qa-boot generate` renders all domain summaries, `unknowns.md`, `CLAUDE.qa.md`,
   and the 4 skills from `facts.json`.
5. Unknowns are explicit and each carries the exact human question.
6. With `qaradar` installed, `qa-boot scan --with-qaradar` spawns it, and
   `repo-risk.md` + the `repo_quality` fact are generated from real output; with
   `qaradar` absent, the scan still succeeds and records the gap as unknown.
7. The maturity rubric produces deterministic scores with evidence and next steps.
8. All tests pass; scanners and renderers are independently tested.
```