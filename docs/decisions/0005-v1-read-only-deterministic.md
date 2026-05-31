# ADR 0005: V1 is read-only and deterministic

## Status

Accepted

## Context

The V1 spec referenced human-provided (`told`) facts, Coach Mode, and a demo
that adds a human fact and re-answers. But:

- `told` fact entry (`qa-boot facts add`) was scoped to V1.5.
- Coach Mode is elicitation-heavy and depends on capturing human knowledge.
- The CLI philosophy is "scan first, ask later" and "avoid long interactive
  questioning."
- ADR 0001 requires the CLI to be useful without an AI agent.

This created a contradiction: the flagship demo and Coach Mode depended on a
write-back path that V1 did not actually provide.

## Decision

V1 is strictly read-only and deterministic.

1. **No `told` facts in V1.** Human-provided facts move to V1.5, together with
   the `qa-boot facts add` command.
2. **Coach Mode moves to V2.** V1 supports only **Explore Mode** and
   **Refresh Mode**. V1 still generates onboarding *questions* from unknowns; it
   does not ingest the answers.
3. **`facts.json` is the single source of truth.** `scan` writes/updates
   `facts.json` only, then auto-runs `generate`. `generate` produces all
   Markdown, `CLAUDE.qa.md`, and skills from facts. A `--no-generate` flag skips
   the auto-generate step.
4. **Maturity scores are computed deterministically** from a fixed rubric (see
   doc 04). Any AI synthesis lives only in generated Claude skill prose, never in
   the score.

## Reason

- Removes the contradiction between the demo, Coach Mode, and actual V1 scope.
- Eliminates the hardest part of the fact engine for V1: there is no
  "human fact vs. fresh scan" conflict to reconcile.
- Keeps V1 honest, testable, and runnable without an agent.

## Consequences

- Demo (doc 09) is rewritten to a read-only flow: deterministic facts +
  explicit unknowns + the exact human question to ask. No fact write-back.
- The fact store still persists and upserts by id (so V1.5 can layer told-fact
  preservation on top without a rewrite).
- `qa-context/*.md` files are always regenerated; there is no human edit surface
  in V1.
- Coach Mode, told facts, and `qa-boot facts add` are explicit V1.5/V2 work.
