# ADR 0003: QA Radar as evidence provider

## Status

Accepted

## Context

QA Radar provides deterministic repo-risk signals such as churn, coverage gaps, test-to-source mapping, and risk-ranked files.

This overlaps with some quality-audit ideas but does not replace the broader QA context bootloader.

## Decision

QA Radar will be integrated as the first external deterministic evidence provider.

QA Boot will consume QA Radar output and normalize it into the fact store.

## Reason

QA Radar is useful concrete evidence, but it does not know business priority, release process, ownership, org maturity, or agent permissions.

## Consequences

- QA Boot should not rebuild QA Radar internals.
- QA Radar findings should feed `qa-context/repo-risk.md`.
- QA Boot must separate technical repo risk from business priority.
- QA Radar should be optional, not required.
