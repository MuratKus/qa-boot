# Spec Index

This repository contains the product and implementation specification for **QA Boot / QA Context Bootloader**.

## Reading rules for AI agents

Do not load every document by default.

Always read:

- `docs/00-overview.md`
- `docs/02-v1-scope.md`

Then load only the documents relevant to the current task.

## Documents

| File | Purpose |
|---|---|
| `docs/00-overview.md` | Short product overview, problem, thesis, users |
| `docs/01-product-spec.md` | Main product behavior, modes, principles, non-goals |
| `docs/02-v1-scope.md` | V0/V1 scope, non-goals, acceptance criteria |
| `docs/03-architecture.md` | Technical architecture, module layout, data flow |
| `docs/04-data-model.md` | Fact schema, provenance, confidence, unknowns |
| `docs/05-evidence-providers.md` | Deterministic evidence provider model |
| `docs/06-qa-radar-adapter.md` | QA Radar integration spec |
| `docs/07-claude-code-output.md` | Generated Claude Code files and skills |
| `docs/08-cli-behavior.md` | CLI commands, UX, flags, expected behavior |
| `docs/09-demo-plan.md` | Demo strategy and sample org plan |
| `docs/10-roadmap.md` | V0 → V3 roadmap |

## Decision records

Check `docs/decisions/` before changing major direction.

| File | Decision |
|---|---|
| `docs/decisions/0001-cli-first.md` | V1 is a CLI generator, not a Claude plugin |
| `docs/decisions/0002-deterministic-first.md` | Scripts and scanners before agents |
| `docs/decisions/0003-qa-radar-as-evidence-provider.md` | QA Radar is an adapter, not the whole product |
| `docs/decisions/0004-shared-vs-local-context.md` | Commit shared QA context, keep sensitive context local |
| `docs/decisions/0005-v1-read-only-deterministic.md` | V1 is read-only/deterministic; told facts → V1.5, Coach Mode → V2, scan auto-runs generate |

## Task-specific loading guide

### Implementing CLI commands

Read:

- `docs/02-v1-scope.md`
- `docs/03-architecture.md`
- `docs/08-cli-behavior.md`
- `docs/decisions/0001-cli-first.md`

### Implementing scanners or fact storage

Read:

- `docs/03-architecture.md`
- `docs/04-data-model.md`
- `docs/05-evidence-providers.md`
- `docs/decisions/0002-deterministic-first.md`

### Implementing QA Radar integration

Read:

- `docs/05-evidence-providers.md`
- `docs/06-qa-radar-adapter.md`
- `docs/decisions/0003-qa-radar-as-evidence-provider.md`

### Implementing Claude Code output

Read:

- `docs/07-claude-code-output.md`
- `docs/04-data-model.md`
- `docs/02-v1-scope.md`

### Preparing the demo

Read:

- `docs/09-demo-plan.md`
- `docs/06-qa-radar-adapter.md`
- `docs/07-claude-code-output.md`

## Product boundary reminder

QA Boot should make AI-assisted QA more grounded, not more autonomous by default.
