# ADR 0001: CLI-first instead of Claude plugin-first

## Status

Accepted

## Context

QA Boot needs to inspect repositories, generate files, and run deterministic scanners.

This should not depend on an AI agent runtime.

## Decision

V1 will be implemented as a CLI that generates files.

Claude Code integration is generated as output, not used as the primary runtime.

## Reason

A CLI is:

- easier to test,
- easier to run in CI,
- easier to install with `npx`,
- better for deterministic scanning,
- less likely to create token bloat or permission prompt fatigue.

## Consequences

- Claude plugin packaging may be added later.
- V1 should not depend on Claude plugin behavior.
- The CLI remains useful even without Claude.
