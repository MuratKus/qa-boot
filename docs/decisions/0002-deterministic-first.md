# ADR 0002: Deterministic-first scanning

## Status

Accepted

## Context

Many QA/project facts can be discovered reliably with scripts:

- test frameworks,
- CI config,
- build files,
- docs,
- coverage artifacts,
- git churn,
- existing agent config.

Asking an AI agent to rediscover these repeatedly wastes tokens and can produce inconsistent results.

## Decision

QA Boot should use deterministic scanners and evidence providers before asking an AI agent to interpret anything.

## Reason

Repository facts, CI files, test configs, coverage files, and git churn can be detected more reliably by scripts than by repeatedly asking an agent.

## Consequences

- The agent is used for synthesis and guidance, not raw discovery.
- Scanners and providers become core architecture.
- The project stays practical and testable.
