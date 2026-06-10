# QA Boot — Told Facts & Agent-Mediated Onboarding (Design)

**Date:** 2026-06-11
**Status:** Approved by Murat (brainstorm 2026-06-10/11)
**Iteration:** the "capture core + passive decay" cut (Approach B). Approach A extras are banked in §13.

## 1. Summary

qa-boot's core identity is a **QA onboarding/consolidating tool — a lasting organizational QA memory** — not per-PR tooling. This iteration builds the irreducible loop of that idea:

> unknowns → agent interviews a human → answers persist as **`told` facts** → rendered context improves → facts decay → questions resurface → memory stays alive.

Concretely: a `told` provenance tier in the fact model, a `qa-boot tell` CLI command as the single validated write path, an append-only interview log for retrospection, unknown suppression/resurfacing wired into the scan pipeline, and a generated **`qa-onboard`** skill that drives an *informed* agent-mediated interview.

## 2. Goals / non-goals

**Goals (this iteration):**
- Capture human/business QA knowledge as first-class, provenance-tracked facts.
- Make the capture loop agent-mediated (Claude Code interview), with the CLI owning schema/validation.
- Close answered unknowns; resurface them when answers go stale (passive decay).
- Persist a durable, human-readable Q&A history.
- Keep every schema decision forward-compatible with org/multi-repo scope and external knowledge sources.

**Non-goals (explicitly deferred — see §13):**
- Contradiction guard (observed-vs-told conflict detection).
- Polished re-confirmation UX ("still true? y/n" — lands with the `refresh`/`status` cluster).
- `documented` provenance tier / external KB harvest (Notion, Confluence).
- Org memory repo / `scope: "org"` writes / workspace mode.
- PR-risk (parked separately; verified diff contract banked in `docs/06-qa-radar-adapter.md`).

## 3. Decisions made (and why)

| Decision | Choice | Rationale |
|---|---|---|
| Capture surface | Agent-mediated interview via generated skill | Users already live in Claude Code; agents adapt phrasing and anchor questions in repo specifics. |
| Write path | `qa-boot tell` CLI command, never direct file edits by agents | Tool owns schema, validation, provenance, expiry; agents are sloppy YAML editors; crisp CLI errors let agents self-correct. |
| What persists | **Confirm-to-persist**: only what the human said or explicitly confirmed | Keeps the "qa-boot never lies to an agent" property. Agent beliefs stay ephemeral and only shape better questions. No `inferred` persistence from interviews. |
| Tell scope | Answers keyed to unknown ids **+** domain-guided free-form | True consolidation captures knowledge qa-boot never asked about, but bounded by known domains — not arbitrary keys. |
| Interview precondition | Agent gathers baseline repo understanding first (prompted by the skill, not a deterministic run) | An informed question ("qaradar flags `payment/` untested — is that the critical path?") costs the human one word; a generic one costs them an essay. |
| Memory substrate | Git — `facts.json` (current truth) + append-only interview log (history) | Versioned, shared, PR-reviewable knowledge; zero infrastructure. |
| PR-risk / `scan --base` | **Not** built into scan facts | Diffs are dynamic; scan-time facts go stale by the next PR. Deliberate divergence from the old V1 note. |

## 4. Data model: told facts

A told fact is a normal `Fact` (produced via the existing `makeFact` machinery: `last_verified`, staleness, limitations) with `provenance: "told"` and four new **optional** fields on the Fact type — no migration for existing facts:

```json
{
  "id": "ownership.e2e-suite",
  "domain": "ownership",
  "statement": "The QA guild owns the e2e suite.",
  "provenance": "told",
  "confidence": 0.9,
  "told_by": "murat",
  "scope": "repo",
  "source": null,
  "answers_unknown": "ownership.test-ownership",
  "evidence_provider": "human-interview",
  "evidence": ["qa-interview-log.md 2026-06-10"],
  "last_verified": "2026-06-10",
  "expires_after_days": 180
}
```

Rules:
- **`provenance`** gains a third value `told`. The enum stays open so a `documented` tier can be added later without migration.
- **`told_by`** — required for told facts.
- **`scope`** — defaults to `"repo"`; **only `"repo"` is accepted in this iteration** (validation rejects anything else). The field exists; the feature doesn't.
- **`source`** — optional URL/pointer (forward hook for the `documented` tier and source-linked answers).
- **`answers_unknown`** — present only in answer mode; links an answer to the unknown it closes.
- **Confidence fixed at 0.9** — human-confirmed, but humans can be wrong or stale.
- **Expiry default 180 days** (vs ~30 for observed facts) — org knowledge changes slower than code.

## 5. CLI: `qa-boot tell`

One command, two modes:

```bash
# Answer mode: keyed to an open unknown's id
qa-boot tell <unknown-id> "<answer>" --by <who> [--source <url>]

# Free-form mode: domain-guided
qa-boot tell --domain <domain> "<statement>" --by <who> [--id <slug>] [--source <url>]
```

Behavior:
- **Validation:** answer mode requires the unknown id to exist and be open; free-form mode requires `--domain` to be one of qa-boot's known domains. `--by` required. `--scope` other than `repo` rejected. Invalid input fails loudly **listing the valid ids/domains** (agents need crisp errors to self-correct).
- **Id generation (free-form):** `<domain>.<slug>`, where the slug comes from `--id` when given, else is derived from the statement — reusing the existing slug helper (from agent-facts). Collision with an existing fact id → error suggesting `--id`.
- **Writes:** upsert into `qa-context/facts.json` via the existing `FactStore`; append an entry to the interview log.
- **Output:** prints what was recorded (id, statement, scope) + how many unknowns remain open.

## 6. Interview log: `qa-context/qa-interview-log.md`

Append-only, written by `tell` only (never touched by `generate`). Entries are self-contained — the property that makes per-repo logs mergeable/consolidatable later:

```md
## 2026-06-10 — murat
**Q (ownership.test-ownership):** Who owns the test suites and quality gates?
**A:** The QA guild owns the e2e suite.
→ fact `ownership.e2e-suite` (scope: repo)
```

Free-form entries use the same shape with `**Told (domain):**` in place of the `Q` line. File is created on first `tell`.

## 7. Pipeline: resolution & resurfacing

**Suppression rule:** an unknown is suppressed when a **non-stale** told fact with `answers_unknown` matching it exists. Free-form told facts never suppress unknowns — only keyed answers close questions.

**The integration change that makes this work:** today `cmdScan` runs the pipeline on fresh scanner output, then upserts into the store — the pipeline never sees stored facts. Change: `cmdScan` **loads the store first and feeds non-stale told facts into the pipeline** alongside scanner output. This yields three properties:

1. `deriveUnknownFacts` can suppress answered questions;
2. scan can never clobber told facts (scanners never re-emit told ids; upsert is keyed by id);
3. the maturity rubric sees told facts (§9).

**Resurfacing (passive decay):** when a told fact passes `expires_after_days`, existing `markTimeStaleness` flags it stale → next scan the suppression rule ignores it → the question reappears in `unknowns.md`, **with history**:

> **Q:** Who owns the test suites? *(previously answered 2026-06-10 by murat: "The QA guild owns the e2e suite." — please re-confirm or update)*

Re-confirmation in this iteration = re-`tell` (even the same answer), which refreshes `last_verified`. No new machinery.

## 8. Rendering changes

- Domain summaries are table-driven → told facts appear in `qa-context/*.md` automatically with a provenance marker. Verify; only touch if the provenance marker needs adding.
- `unknowns.md`: resurfaced-with-history treatment (renderer reads the stale answering fact for the parenthetical).
- `CLAUDE.qa.md`: one provenance legend line (observed / inferred / **told**) so agents weight provenance correctly.

## 9. Maturity rubric

Minimal touch: dimensions that ask "is this known?" may count relevant told facts (e.g. `quality_ownership` can move off 0 when ownership is told). Scope strictly to a small table change — which dimensions consume which told-fact domains is decided at planning against the real rubric code. Maturity then reflects *captured knowledge*, not just repo artifacts.

## 10. Generated skill: `qa-onboard`

5th entry in `renderSkills()`, same `SKILL.md` mechanics, phased body:

1. **Precondition** — if `qa-context/`/`unknowns.md` missing → say so, point at `qa-boot scan`; don't improvise.
2. **Gather** — if you lack baseline understanding of this repo, build it first: README/docs, structure, `qa-context/*.md`, `repo-risk.md`. Don't interview from ignorance.
3. **Play back** — summarize your understanding to the human; let them correct it (corrections are capturable answers).
4. **Interview** — open unknowns one question at a time, anchored in gathered specifics; then invite guided free-form per domain ("anything about environments I should know?").
5. **Capture** — after each human answer run `qa-boot tell …` with `--by <human>`. **Confirm-to-persist:** record only what the human said or explicitly confirmed — never your own inference.
6. **Wrap** — summarize captures, list remaining unknowns, suggest `qa-boot scan`/`generate` to refresh rendered context.

Like `qa-risk`, the body is static instructional text; no runtime logic.

## 11. Testing strategy

Everything except skill prose is deterministic:
- **tell:** validation (bad unknown id, bad domain, missing `--by`, `scope != repo`, id collisions), fact shape (all §4 fields), slug generation, log append format, output text.
- **Pipeline:** told fact in → unknown suppressed; stale told fact → unknown resurfaces with history; scanners never clobber told facts.
- **Rubric:** told facts move the agreed dimensions.
- **Renderers:** snapshot of resurfaced unknown rendering + provenance legend.
- **Skill:** `renderSkills` includes `qa-onboard`; body render test like the existing four.
- **End-to-end:** one CLI integration test on a temp fixture repo (scan → tell → scan → assert suppression + log).

## 12. Forward-compatibility commitments

Cheap choices made now so the bigger vision needs no migration:
- `scope` field exists (enum extensible to `org`/workspace).
- `source` field exists (KB/source-linked answers).
- Provenance enum open for `documented`.
- Interview log entries self-contained → mergeable upward.
- Domains stay repo-agnostic (describe org concepts, not file paths).

## 13. Deferred design notes (banked — Approach A & future architecture)

Recorded so the thinking isn't lost; **none of this is in the current iteration.**

- **Contradiction guard:** detect observed-vs-told conflicts (e.g. told "Jenkins", observed GitHub Actions). Needs a mapping of which observed fact ids can contradict which told domains. On conflict: flag for re-confirmation; **never auto-resolve** in either direction.
- **Re-confirm UX:** a cheap "still true? y/n" pass over expiring told facts — belongs to the `refresh`/`status` cluster. Initial capture is expensive; maintenance should be one-word answers. That asymmetry is what makes memory compound.
- **`documented` provenance tier / external KBs:** Notion/Confluence are evidence providers, structurally like qaradar. **qa-boot never talks to the KB** — the onboarding agent already has MCP access; the skill instructs it to harvest declared sources *before* interviewing. A KB hit downgrades an open-ended question to a confirmation ("Notion says payments-team owns checkout — still true?"); on confirm, provenance upgrades to `told` with `source` retained. Confidence/trust order: observed ≥ told > documented (docs rot). "Where org knowledge lives" is itself capturable today as a `knowledge_sources` told fact; the loop is iterative — sources discovered mid-interview feed the *next* run, no double-tasking in one session.
- **Org memory federation (multi-repo):** every fact has one home by scope — repo facts in the repo, org facts in **one org memory repo** (plain git repo). Never replicate; consumers **fetch at render time** and stamp "org memory as of `<commit>`". `tell --scope org` writes/PRs to the org repo. Collaboration = PRs on the org memory repo. Freshness = the same decay/resurface lifecycle, applied once at the org home, inherited by N readers.
- **Positioning (Murat, 2026-06-10):** "Onboard yourself and your agent in quality for your organization and grow your QA memory with time — don't be restricted to a repo, have a lasting organizational memory that helps you advance quality into the AI age."

## 14. Open items for planning (verify against real code)

- Real unknown fact ids/shape in `src/unknowns/unknowns.ts` (the suppression list and how ids are keyed) — the `answers_unknown` matching must target the real ids.
- Real `Fact`/`MakeFactInput` types for the four new optional fields.
- `FactStore` upsert semantics for the scan-preserves-told-facts guarantee.
- Which rubric dimensions consume which told domains (small table, decided at planning).
- CLI wiring pattern for a new `tell` command in commander (mirror `scan`/`generate`).
