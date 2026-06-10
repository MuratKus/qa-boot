# QA Boot — Told Facts & Agent-Mediated Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the capture core of qa-boot's organizational QA memory: a `told` provenance tier, a `qa-boot tell` CLI write path, an append-only interview log, unknown suppression/resurfacing, told-aware maturity, and a generated `qa-onboard` skill.

**Architecture:** Extends the existing fact pipeline. New `src/tell/` module (pure logic + log writer) behind a new commander command; `cmdScan` now loads the store first and feeds non-stale told facts into the pipeline so `deriveUnknownFacts` can suppress answered questions; expiry-based resurfacing rides the existing `markTimeStaleness`. Renderers need only two small touches (unknowns history line, CLAUDE.qa legend) — domain summaries already render provenance.

**Tech Stack:** Node 20+, TypeScript (ESM/NodeNext — local imports use explicit `.js`), Vitest, commander.

**Reference spec:** `docs/superpowers/specs/2026-06-11-qa-boot-told-facts-onboarding-design.md`

**Baseline:** main is green (87 tests). Work directly on `main` (solo project, user consented). Windows/PowerShell.

**Plan-level refinements of the spec (decided here, consistent with its intent):**
- Answer-mode fact id is deterministic: `<unknown-id>.answer` (e.g. `ownership.approvers.answer`). Re-telling the same unknown upserts the same id → re-confirmation refreshes `last_verified` instead of accumulating duplicates.
- No `--scope` CLI flag this iteration. The field is always `"repo"`; rejecting other scopes is moot because the flag does not exist.
- The shared `slug()` is generalized to `[^a-z0-9]+ → "-"` (same outputs for existing agent-config inputs, but safe for sentences) and moved to `src/core/slug.ts`.

---

## File map

| File | Change |
|---|---|
| `src/core/fact.ts` | `Provenance` gains `"told"`; `Fact`/`MakeFactInput` gain optional `told_by`, `scope`, `source`, `answers_unknown` |
| `src/core/slug.ts` | new — `slug()` moved/generalized from agent-facts |
| `src/domains/agent-facts.ts` | import `slug` from core (delete local copy) |
| `src/core/fact-store.ts` | add `remove(id)` |
| `src/unknowns/unknowns.ts` | export `knownUnknownIds()`/`unknownSpec()`; suppression by non-stale told answers |
| `src/tell/tell.ts` | new — `applyTell` pure logic (validation, fact build, unknown removal) |
| `src/tell/interview-log.ts` | new — `formatLogEntry`/`appendInterviewLog` |
| `src/pipeline/run-scan.ts` | `priorFacts` param merged into the fact base |
| `src/cli/commands/scan.ts` | load store first; feed non-stale told facts into the pipeline |
| `src/cli/commands/tell.ts` | new — `cmdTell` |
| `src/cli/index.ts` | register `tell` command |
| `src/maturity/rubric.ts` | told-answer boost for 4 dimensions |
| `src/generate/special-renderers.ts` | `renderUnknowns` resurfaced-with-history line |
| `src/generate/claude-qa.ts` | told-provenance legend line |
| `src/generate/skills.ts` | 5th skill: `qa-onboard` |

---

## Task 1: Fact model — `told` provenance + four optional fields

**Files:**
- Modify: `src/core/fact.ts`
- Test: `test/core/fact.test.ts` (append; create if it does not exist — check first)

- [ ] **Step 1: Write failing tests**

Append to `test/core/fact.test.ts` (if the file doesn't exist, create it with the imports shown):

```ts
import { describe, it, expect } from "vitest";
import { makeFact } from "../../src/core/fact.js";

describe("makeFact told fields", () => {
  it("passes told fields through when provided", () => {
    const f = makeFact(
      {
        id: "ownership.approvers.answer",
        domain: "ownership",
        statement: "QA guild approves risky changes.",
        provenance: "told",
        confidence: 0.9,
        evidence_provider: "human-interview",
        told_by: "murat",
        scope: "repo",
        source: "https://example.com/page",
        answers_unknown: "ownership.approvers",
        expires_after_days: 180,
      },
      "2026-06-11",
    );
    expect(f.provenance).toBe("told");
    expect(f.told_by).toBe("murat");
    expect(f.scope).toBe("repo");
    expect(f.source).toBe("https://example.com/page");
    expect(f.answers_unknown).toBe("ownership.approvers");
    expect(f.expires_after_days).toBe(180);
  });

  it("omits told fields entirely when not provided", () => {
    const f = makeFact(
      { id: "repo.readme", domain: "repo", statement: "README present.", provenance: "observed", confidence: 0.9, evidence_provider: "repo-scanner" },
      "2026-06-11",
    );
    expect("told_by" in f).toBe(false);
    expect("answers_unknown" in f).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/core/fact.test.ts`
Expected: FAIL — TS rejects `provenance: "told"` and the unknown input fields.

- [ ] **Step 3: Modify `src/core/fact.ts`**

Change the `Provenance` type and add the fields to both interfaces:

```ts
export type Provenance = "observed" | "inferred" | "unknown" | "told";
export type FactScope = "repo";
```

Add to the `Fact` interface (after `expires_after_days`):

```ts
  told_by?: string;
  scope?: FactScope;
  source?: string | null;
  answers_unknown?: string;
```

Add the same four optional fields to `MakeFactInput`. In `makeFact`, after building the base object, conditionally attach them so absent fields stay absent in JSON:

```ts
export function makeFact(input: MakeFactInput, today: string = todayISO()): Fact {
  const f: Fact = {
    id: input.id,
    domain: input.domain,
    statement: input.statement,
    value: input.value ?? null,
    provenance: input.provenance,
    confidence: input.confidence,
    evidence_provider: input.evidence_provider,
    evidence_command: input.evidence_command ?? "qa-boot scan",
    evidence: input.evidence ?? [],
    limitations: input.limitations ?? [],
    risk_if_wrong: input.risk_if_wrong ?? "",
    needs_human_confirmation: input.needs_human_confirmation ?? false,
    last_verified: today,
    expires_after_days: input.expires_after_days ?? 30,
  };
  if (input.told_by !== undefined) f.told_by = input.told_by;
  if (input.scope !== undefined) f.scope = input.scope;
  if (input.source !== undefined) f.source = input.source;
  if (input.answers_unknown !== undefined) f.answers_unknown = input.answers_unknown;
  return f;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/core/fact.test.ts` → PASS. Then `npm test` (no regressions) and `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/core/fact.ts test/core/fact.test.ts
git commit -m "feat: told provenance + told_by/scope/source/answers_unknown fact fields"
```

---

## Task 2: Shared slug helper

**Files:**
- Create: `src/core/slug.ts`
- Modify: `src/domains/agent-facts.ts` (delete local `slug`, import shared)
- Test: `test/core/slug.test.ts` (create)

- [ ] **Step 1: Write failing tests**

Create `test/core/slug.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { slug } from "../../src/core/slug.js";

describe("slug", () => {
  it("keeps existing agent-config behavior", () => {
    expect(slug(".claude")).toBe("claude");
    expect(slug("CLAUDE.md")).toBe("claude-md");
  });

  it("handles sentences with punctuation", () => {
    expect(slug("Staging resets nightly; don't trust data before 6am.")).toBe(
      "staging-resets-nightly-don-t-trust-data-before-6am",
    );
  });

  it("caps length at 60 and trims trailing dashes", () => {
    const s = slug("a".repeat(80) + " end");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(slug("!!! ???")).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/core/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/slug.ts` and switch agent-facts to it**

```ts
export function slug(name: string, maxLen = 60): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
}
```

In `src/domains/agent-facts.ts`: delete the local `function slug(...)` and add `import { slug } from "../core/slug.js";` with the other imports. No other change.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/core/slug.test.ts test/domains/agent-facts.test.ts` → PASS (agent-facts tests confirm unchanged behavior). Then `npm test`, `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/core/slug.ts src/domains/agent-facts.ts test/core/slug.test.ts
git commit -m "refactor: shared generalized slug helper in core"
```

---

## Task 3: `FactStore.remove`

**Files:**
- Modify: `src/core/fact-store.ts`
- Test: `test/core/fact-store.test.ts` (append)

- [ ] **Step 1: Write failing test**

Append to `test/core/fact-store.test.ts` (inside the existing describe, matching its style — read the file first; it already constructs facts somehow, reuse that helper/pattern):

```ts
it("remove deletes a fact by id and reports whether it existed", () => {
  const store = new FactStore([
    makeFact({ id: "a.one", domain: "a", statement: "s", provenance: "observed", confidence: 1, evidence_provider: "t" }, "2026-06-11"),
  ]);
  expect(store.remove("a.one")).toBe(true);
  expect(store.byId("a.one")).toBeUndefined();
  expect(store.remove("a.one")).toBe(false);
});
```

(If `makeFact` is not imported in that test file, add `import { makeFact } from "../../src/core/fact.js";`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/core/fact-store.test.ts`
Expected: FAIL — `remove` is not a function.

- [ ] **Step 3: Add to `src/core/fact-store.ts`** (after `markTimeStaleness`)

```ts
  remove(id: string): boolean {
    return this.facts.delete(id);
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/core/fact-store.test.ts` → PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/core/fact-store.ts test/core/fact-store.test.ts
git commit -m "feat: FactStore.remove"
```

---

## Task 4: Unknowns — exported spec lookup + suppression by told answers

**Files:**
- Modify: `src/unknowns/unknowns.ts`
- Test: `test/unknowns/unknowns.test.ts` (append)

- [ ] **Step 1: Write failing tests**

Append to `test/unknowns/unknowns.test.ts` (read it first; `deriveUnknownFacts` and `makeFact` usage should already exist — match its helpers):

```ts
import { knownUnknownIds, unknownSpec } from "../../src/unknowns/unknowns.js";

describe("unknown spec lookup", () => {
  it("exposes the known unknown ids", () => {
    const ids = knownUnknownIds();
    expect(ids).toContain("ownership.approvers");
    expect(ids).toContain("business_priority.critical-areas");
    expect(ids.length).toBeGreaterThanOrEqual(9);
  });

  it("returns domain and question for a spec id", () => {
    const s = unknownSpec("ownership.approvers")!;
    expect(s.domain).toBe("ownership");
    expect(s.question.length).toBeGreaterThan(0);
    expect(unknownSpec("nope.nothing")).toBeUndefined();
  });
});

describe("suppression by told answers", () => {
  it("suppresses an unknown when a told fact answers it", () => {
    const told = makeFact(
      {
        id: "ownership.approvers.answer", domain: "ownership", statement: "QA guild approves.",
        provenance: "told", confidence: 0.9, evidence_provider: "human-interview",
        answers_unknown: "ownership.approvers",
      },
      "2026-06-11",
    );
    const ids = deriveUnknownFacts([told], "2026-06-11").map((f) => f.id);
    expect(ids).not.toContain("ownership.approvers");
    expect(ids).toContain("business_priority.critical-areas");
  });

  it("free-form told facts (no answers_unknown) suppress nothing", () => {
    const told = makeFact(
      { id: "ownership.qa-guild", domain: "ownership", statement: "s", provenance: "told", confidence: 0.9, evidence_provider: "human-interview" },
      "2026-06-11",
    );
    const ids = deriveUnknownFacts([told], "2026-06-11").map((f) => f.id);
    expect(ids).toContain("ownership.approvers");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/unknowns/unknowns.test.ts`
Expected: FAIL — `knownUnknownIds`/`unknownSpec` not exported; suppression test fails.

- [ ] **Step 3: Modify `src/unknowns/unknowns.ts`**

Add exports after the `SPECS` array:

```ts
export function knownUnknownIds(): string[] {
  return SPECS.map((s) => s.id);
}

export function unknownSpec(id: string): { id: string; domain: string; question: string } | undefined {
  const s = SPECS.find((x) => x.id === id);
  return s ? { id: s.id, domain: s.domain, question: s.question } : undefined;
}
```

In `deriveUnknownFacts`, before the `for` loop add:

```ts
  const answered = new Set(
    facts.filter((f) => f.provenance === "told" && f.answers_unknown).map((f) => f.answers_unknown as string),
  );
```

and as the first line inside the loop:

```ts
    if (answered.has(spec.id)) continue;
```

(Stale filtering is the caller's job — `cmdScan` only passes non-stale told facts in; see Task 7.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/unknowns/unknowns.test.ts` → PASS. Then `npm test`, `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/unknowns/unknowns.ts test/unknowns/unknowns.test.ts
git commit -m "feat: unknown spec lookup + suppression by told answers"
```

---

## Task 5: `applyTell` core logic

**Files:**
- Create: `src/tell/tell.ts`
- Test: `test/tell/tell.test.ts` (create)

- [ ] **Step 1: Write failing tests**

Create `test/tell/tell.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FactStore } from "../../src/core/fact-store.js";
import { makeFact } from "../../src/core/fact.js";
import { applyTell, TellError, TELLABLE_DOMAINS } from "../../src/tell/tell.js";

const TODAY = "2026-06-11";

function storeWithUnknown(): FactStore {
  return new FactStore([
    makeFact(
      {
        id: "ownership.approvers", domain: "ownership", statement: "Who approves risky changes is unknown.",
        provenance: "unknown", confidence: 0, evidence_provider: "unknowns-generator",
        value: { question: "Who owns and approves risky changes in this repo?" },
      },
      TODAY,
    ),
  ]);
}

describe("applyTell answer mode", () => {
  it("records a told fact with deterministic id and removes the unknown", () => {
    const store = storeWithUnknown();
    const r = applyTell(store, { unknownId: "ownership.approvers", statement: "QA guild approves risky changes.", by: "murat" }, TODAY);
    expect(r.fact.id).toBe("ownership.approvers.answer");
    expect(r.fact.domain).toBe("ownership");
    expect(r.fact.provenance).toBe("told");
    expect(r.fact.confidence).toBe(0.9);
    expect(r.fact.expires_after_days).toBe(180);
    expect(r.fact.told_by).toBe("murat");
    expect(r.fact.scope).toBe("repo");
    expect(r.fact.answers_unknown).toBe("ownership.approvers");
    expect(r.question).toContain("approves risky changes");
    expect(r.removedUnknown).toBe(true);
    expect(store.byId("ownership.approvers")).toBeUndefined();
    expect(store.byId("ownership.approvers.answer")).toBeDefined();
    expect(r.remainingUnknowns).toBe(0);
  });

  it("re-telling the same unknown upserts the same fact id (re-confirmation)", () => {
    const store = storeWithUnknown();
    applyTell(store, { unknownId: "ownership.approvers", statement: "First answer.", by: "murat" }, "2026-06-01");
    const r2 = applyTell(store, { unknownId: "ownership.approvers", statement: "Updated answer.", by: "murat" }, TODAY);
    expect(r2.fact.id).toBe("ownership.approvers.answer");
    expect(store.byId("ownership.approvers.answer")!.statement).toBe("Updated answer.");
    expect(store.byId("ownership.approvers.answer")!.last_verified).toBe(TODAY);
  });

  it("rejects an id that is not a known unknown, listing valid ids", () => {
    expect(() => applyTell(new FactStore(), { unknownId: "nope.x", statement: "s", by: "m" }, TODAY)).toThrow(TellError);
    try {
      applyTell(new FactStore(), { unknownId: "nope.x", statement: "s", by: "m" }, TODAY);
    } catch (e) {
      expect(String((e as Error).message)).toContain("ownership.approvers");
    }
  });
});

describe("applyTell free-form mode", () => {
  it("records a domain-scoped fact with slug id", () => {
    const store = new FactStore();
    const r = applyTell(store, { domain: "environment", statement: "Staging resets nightly.", by: "murat" }, TODAY);
    expect(r.fact.id).toBe("environment.staging-resets-nightly");
    expect(r.fact.answers_unknown).toBeUndefined();
    expect(r.removedUnknown).toBe(false);
  });

  it("respects --id and --source", () => {
    const store = new FactStore();
    const r = applyTell(
      store,
      { domain: "environment", statement: "Staging resets nightly.", by: "murat", idSlug: "staging-reset", source: "https://wiki/x" },
      TODAY,
    );
    expect(r.fact.id).toBe("environment.staging-reset");
    expect(r.fact.source).toBe("https://wiki/x");
  });

  it("rejects unknown domains, listing valid ones", () => {
    expect(() => applyTell(new FactStore(), { domain: "vibes", statement: "s", by: "m" }, TODAY)).toThrow(/Valid domains/);
  });

  it("refuses to shadow a non-told fact id", () => {
    const store = new FactStore([
      makeFact({ id: "environment.staging-resets-nightly", domain: "environment", statement: "s", provenance: "observed", confidence: 1, evidence_provider: "t" }, TODAY),
    ]);
    expect(() => applyTell(store, { domain: "environment", statement: "Staging resets nightly.", by: "m" }, TODAY)).toThrow(/already exists/);
  });

  it("overwrites an existing told fact with the same id", () => {
    const store = new FactStore();
    applyTell(store, { domain: "environment", statement: "Staging resets nightly.", by: "m" }, "2026-06-01");
    const r = applyTell(store, { domain: "environment", statement: "Staging resets nightly.", by: "m" }, TODAY);
    expect(r.fact.last_verified).toBe(TODAY);
  });
});

describe("applyTell validation", () => {
  it("requires --by", () => {
    expect(() => applyTell(new FactStore(), { unknownId: "ownership.approvers", statement: "s", by: "" }, TODAY)).toThrow(/--by/);
  });

  it("requires a mode (unknown id or --domain)", () => {
    expect(() => applyTell(new FactStore(), { statement: "s", by: "m" }, TODAY)).toThrow(TellError);
  });

  it("exposes the tellable domains", () => {
    expect(TELLABLE_DOMAINS).toContain("ownership");
    expect(TELLABLE_DOMAINS).toContain("knowledge_sources");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/tell/tell.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/tell/tell.ts`**

```ts
import type { Fact } from "../core/fact.js";
import { makeFact } from "../core/fact.js";
import type { FactStore } from "../core/fact-store.js";
import { slug } from "../core/slug.js";
import { knownUnknownIds, unknownSpec } from "../unknowns/unknowns.js";

export const TELLABLE_DOMAINS: readonly string[] = [
  "build",
  "release",
  "environment",
  "test_data",
  "ownership",
  "business_priority",
  "agent_permissions",
  "test_trust",
  "knowledge_sources",
];

export interface TellInput {
  unknownId?: string;
  domain?: string;
  statement: string;
  by: string;
  source?: string;
  idSlug?: string;
}

export interface TellResult {
  fact: Fact;
  question?: string;
  removedUnknown: boolean;
  remainingUnknowns: number;
}

export class TellError extends Error {}

export function applyTell(store: FactStore, input: TellInput, today: string): TellResult {
  if (!input.by?.trim()) throw new TellError("Missing --by <who>. Told facts must record who said them.");
  if (!input.statement?.trim()) throw new TellError("Missing statement text.");
  if (input.unknownId) return answerMode(store, input, today);
  if (input.domain) return freeformMode(store, input, today);
  throw new TellError(
    `Provide an unknown id to answer, or --domain for free-form knowledge.\nKnown unknown ids:\n  ${knownUnknownIds().join("\n  ")}`,
  );
}

function answerMode(store: FactStore, input: TellInput, today: string): TellResult {
  const spec = unknownSpec(input.unknownId!);
  if (!spec) {
    throw new TellError(
      `Unknown id "${input.unknownId}" is not one of qa-boot's unknowns. Valid ids:\n  ${knownUnknownIds().join("\n  ")}`,
    );
  }
  const fact = buildToldFact({ factId: `${spec.id}.answer`, domain: spec.domain, input, answersUnknown: spec.id }, today);
  const removedUnknown = store.remove(spec.id);
  store.upsert([fact]);
  return { fact, question: spec.question, removedUnknown, remainingUnknowns: countOpenUnknowns(store) };
}

function freeformMode(store: FactStore, input: TellInput, today: string): TellResult {
  const domain = input.domain!;
  if (!TELLABLE_DOMAINS.includes(domain)) {
    throw new TellError(`Domain "${domain}" is not tellable. Valid domains: ${TELLABLE_DOMAINS.join(", ")}`);
  }
  const s = input.idSlug ? slug(input.idSlug) : slug(input.statement);
  if (!s) throw new TellError("Could not derive an id from the statement; pass --id <slug>.");
  const factId = `${domain}.${s}`;
  const existing = store.byId(factId);
  if (existing && existing.provenance !== "told") {
    throw new TellError(`Fact id "${factId}" already exists with provenance "${existing.provenance}". Pass --id <slug> to pick a different id.`);
  }
  const fact = buildToldFact({ factId, domain, input }, today);
  store.upsert([fact]);
  return { fact, removedUnknown: false, remainingUnknowns: countOpenUnknowns(store) };
}

function buildToldFact(
  args: { factId: string; domain: string; input: TellInput; answersUnknown?: string },
  today: string,
): Fact {
  return makeFact(
    {
      id: args.factId,
      domain: args.domain,
      statement: args.input.statement.trim(),
      provenance: "told",
      confidence: 0.9,
      evidence_provider: "human-interview",
      evidence: [`qa-interview-log.md ${today}`],
      limitations: ["Human-stated knowledge; may go stale. Re-confirm when expired."],
      expires_after_days: 180,
      told_by: args.input.by.trim(),
      scope: "repo",
      ...(args.input.source ? { source: args.input.source } : {}),
      ...(args.answersUnknown ? { answers_unknown: args.answersUnknown } : {}),
    },
    today,
  );
}

function countOpenUnknowns(store: FactStore): number {
  return store.all().filter((f) => f.provenance === "unknown").length;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/tell/tell.test.ts` → PASS. Then `npm test`, `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/tell/tell.ts test/tell/tell.test.ts
git commit -m "feat: applyTell core - answer and free-form told facts"
```

---

## Task 6: Interview log writer

**Files:**
- Create: `src/tell/interview-log.ts`
- Test: `test/tell/interview-log.test.ts` (create)

- [ ] **Step 1: Write failing tests**

Create `test/tell/interview-log.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatLogEntry, appendInterviewLog } from "../../src/tell/interview-log.js";

describe("formatLogEntry", () => {
  it("formats answer entries with Q and A", () => {
    const s = formatLogEntry({
      date: "2026-06-11", by: "murat",
      unknownId: "ownership.approvers", question: "Who approves?",
      domain: "ownership", statement: "QA guild approves.", factId: "ownership.approvers.answer", scope: "repo",
    });
    expect(s).toContain("## 2026-06-11 — murat");
    expect(s).toContain("**Q (ownership.approvers):** Who approves?");
    expect(s).toContain("**A:** QA guild approves.");
    expect(s).toContain("→ fact `ownership.approvers.answer` (scope: repo)");
  });

  it("formats free-form entries with Told", () => {
    const s = formatLogEntry({
      date: "2026-06-11", by: "murat", domain: "environment",
      statement: "Staging resets nightly.", factId: "environment.staging-reset", scope: "repo",
    });
    expect(s).toContain("**Told (environment):** Staging resets nightly.");
    expect(s).not.toContain("**Q (");
  });
});

describe("appendInterviewLog", () => {
  it("creates the file with a header on first write and appends after", () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-log-"));
    const entry = {
      date: "2026-06-11", by: "murat", domain: "environment",
      statement: "Staging resets nightly.", factId: "environment.staging-reset", scope: "repo",
    };
    const path = appendInterviewLog(repo, entry);
    appendInterviewLog(repo, { ...entry, statement: "Second entry.", factId: "environment.second" });
    const content = readFileSync(path, "utf8");
    expect(content.startsWith("# QA Interview Log")).toBe(true);
    expect(content).toContain("environment.staging-reset");
    expect(content).toContain("environment.second");
    expect(content.indexOf("# QA Interview Log")).toBe(content.lastIndexOf("# QA Interview Log"));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/tell/interview-log.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/tell/interview-log.ts`**

```ts
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface LogEntry {
  date: string;
  by: string;
  unknownId?: string;
  question?: string;
  domain: string;
  statement: string;
  factId: string;
  scope: string;
}

const HEADER = "# QA Interview Log\n\nAppend-only record of human-told QA knowledge. Written by `qa-boot tell`; do not hand-edit.\n";

export function formatLogEntry(e: LogEntry): string {
  const lines = ["", `## ${e.date} — ${e.by}`];
  if (e.unknownId && e.question) {
    lines.push(`**Q (${e.unknownId}):** ${e.question}`, `**A:** ${e.statement}`);
  } else {
    lines.push(`**Told (${e.domain}):** ${e.statement}`);
  }
  lines.push(`→ fact \`${e.factId}\` (scope: ${e.scope})`, "");
  return lines.join("\n");
}

export function appendInterviewLog(repoPath: string, entry: LogEntry): string {
  const path = join(repoPath, "qa-context", "qa-interview-log.md");
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, HEADER, "utf8");
  appendFileSync(path, formatLogEntry(entry), "utf8");
  return path;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/tell/interview-log.test.ts` → PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/tell/interview-log.ts test/tell/interview-log.test.ts
git commit -m "feat: append-only qa-interview-log writer"
```

---

## Task 7: Pipeline — feed stored told facts into scan

**Files:**
- Modify: `src/pipeline/run-scan.ts`
- Modify: `src/cli/commands/scan.ts`
- Test: `test/pipeline/run-scan.test.ts` (append)

- [ ] **Step 1: Write failing test**

Append to `test/pipeline/run-scan.test.ts` (reuse its existing imports/helpers — `buildScanContext`, `normalizeConfig`, `runScan` are already imported; add `makeFact` import if absent):

```ts
describe("runScan with prior told facts", () => {
  it("includes told facts and suppresses the answered unknown", async () => {
    const told = makeFact(
      {
        id: "ownership.approvers.answer", domain: "ownership", statement: "QA guild approves.",
        provenance: "told", confidence: 0.9, evidence_provider: "human-interview",
        answers_unknown: "ownership.approvers", expires_after_days: 180, told_by: "murat", scope: "repo",
      },
      "2026-06-11",
    );
    const ctx = buildScanContext("test-fixtures/repos/gradle-junit", normalizeConfig({ project_name: "x", evidence_providers: { qaradar: { enabled: "false" } } }));
    const facts = await runScan(ctx, "2026-06-11", () => {}, [told]);
    expect(facts.some((f) => f.id === "ownership.approvers.answer")).toBe(true);
    expect(facts.some((f) => f.id === "ownership.approvers")).toBe(false);
  });
});
```

NOTE: read the existing tests in this file first for how `buildScanContext`/`normalizeConfig` are actually called (fixture paths, config shape — the `evidence_providers.qaradar.enabled` nesting above must match the real `normalizeConfig` input; adjust to whatever the existing tests pass to disable qaradar, or use whatever disabled-by-default mechanism they rely on).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/pipeline/run-scan.test.ts`
Expected: FAIL — `runScan` takes no 4th argument (TS error) or the unknown is still present.

- [ ] **Step 3: Modify `src/pipeline/run-scan.ts`**

Change both signatures to accept `priorFacts` and merge them into the base:

```ts
export async function runScan(
  ctx: ScanContext,
  today: string,
  log: (m: string) => void = () => {},
  priorFacts: Fact[] = [],
): Promise<Fact[]> {
  const result = await runScanDetailed(ctx, today, log, priorFacts);
  return result.facts;
}

export async function runScanDetailed(
  ctx: ScanContext,
  today: string,
  log: (m: string) => void = () => {},
  priorFacts: Fact[] = [],
): Promise<RunScanResult> {
```

and change the base line:

```ts
  const base = [...deterministic, ...qaFacts, ...priorFacts];
```

- [ ] **Step 4: Modify `src/cli/commands/scan.ts`**

Replace the body of `cmdScan` so the store is loaded **before** the pipeline and non-stale told facts are passed in (full updated function):

```ts
export async function cmdScan(repoPath: string, opts: ScanOptions): Promise<void> {
  const config = loadConfig(repoPath);
  if (opts.skipQaradar) config.evidence_providers.qaradar.enabled = "false";
  if (opts.withQaradar) config.evidence_providers.qaradar.enabled = "true";

  const ctx = buildScanContext(repoPath, config);
  const today = todayISO();

  const factsPath = join(repoPath, "qa-context", "facts.json");
  const store = FactStore.load(factsPath);
  store.markTimeStaleness(today);
  const priorTold = store.all().filter((f) => f.provenance === "told" && !f.stale);

  const { facts, qaradarRan } = await runScanDetailed(ctx, today, (m) => console.log(m), priorTold);
  if (qaradarRan) console.log("QA Radar: included its analysis.");

  store.upsert(facts);
  store.markTimeStaleness(today);
  store.save(factsPath);
  console.log(`Wrote ${store.all().length} facts to qa-context/facts.json`);

  if (opts.generate) {
    await cmdGenerate(repoPath, { claude: opts.claude });
  }
}
```

(Imports stay as they are — `FactStore`, `join`, `todayISO`, `runScanDetailed` are already imported in this file.)

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/pipeline/run-scan.test.ts` → PASS. Then `npm test` (the CLI tests in `test/cli/commands.test.ts` must still pass — the reordering is behavior-preserving for repos without told facts), `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/pipeline/run-scan.ts src/cli/commands/scan.ts test/pipeline/run-scan.test.ts
git commit -m "feat: scan feeds stored non-stale told facts into the pipeline"
```

---

## Task 8: `qa-boot tell` CLI command + end-to-end test

**Files:**
- Create: `src/cli/commands/tell.ts`
- Modify: `src/cli/index.ts`
- Test: `test/cli/tell.test.ts` (create)

- [ ] **Step 1: Write failing end-to-end test**

Create `test/cli/tell.test.ts`. First read `test/cli/commands.test.ts` and mirror its setup (temp dir creation, any config bootstrapping it does before calling `cmdScan` — reuse the same pattern; if it calls `cmdInit` first or writes a config file, do the same here):

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdScan } from "../../src/cli/commands/scan.js";
import { cmdTell } from "../../src/cli/commands/tell.js";
import type { Fact } from "../../src/core/fact.js";

function factsOf(repo: string): Fact[] {
  return (JSON.parse(readFileSync(join(repo, "qa-context", "facts.json"), "utf8")) as { facts: Fact[] }).facts;
}

describe("qa-boot tell end-to-end", () => {
  it("scan -> tell -> facts/log updated -> rescan keeps unknown closed", async () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-tell-"));
    writeFileSync(join(repo, "README.md"), "# fixture\n", "utf8");

    await cmdScan(repo, { generate: false, claude: false, withQaradar: false, skipQaradar: true });
    expect(factsOf(repo).some((f) => f.id === "ownership.approvers")).toBe(true);

    await cmdTell(repo, "ownership.approvers", "QA guild approves risky changes.", { by: "murat" });

    const facts = factsOf(repo);
    const told = facts.find((f) => f.id === "ownership.approvers.answer")!;
    expect(told.provenance).toBe("told");
    expect(told.told_by).toBe("murat");
    expect(facts.some((f) => f.id === "ownership.approvers")).toBe(false);
    const log = readFileSync(join(repo, "qa-context", "qa-interview-log.md"), "utf8");
    expect(log).toContain("ownership.approvers.answer");

    await cmdScan(repo, { generate: false, claude: false, withQaradar: false, skipQaradar: true });
    const after = factsOf(repo);
    expect(after.some((f) => f.id === "ownership.approvers")).toBe(false);
    expect(after.some((f) => f.id === "ownership.approvers.answer")).toBe(true);
  });

  it("free-form tell works without a prior scan store", async () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-tell-ff-"));
    await cmdTell(repo, undefined, "Staging resets nightly.", { by: "murat", domain: "environment" });
    expect(factsOf(repo).some((f) => f.id === "environment.staging-resets-nightly")).toBe(true);
    expect(existsSync(join(repo, "qa-context", "qa-interview-log.md"))).toBe(true);
  });
});
```

(If `cmdScan` requires an init'd config and `commands.test.ts` does extra setup, replicate that setup here — the assertions stay the same.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/cli/tell.test.ts`
Expected: FAIL — `src/cli/commands/tell.js` does not exist.

- [ ] **Step 3: Create `src/cli/commands/tell.ts`**

```ts
import { join } from "node:path";
import { FactStore } from "../../core/fact-store.js";
import { todayISO } from "../../core/fact.js";
import { applyTell } from "../../tell/tell.js";
import { appendInterviewLog } from "../../tell/interview-log.js";

export interface TellOptions {
  domain?: string;
  by?: string;
  source?: string;
  id?: string;
}

export async function cmdTell(
  repoPath: string,
  unknownId: string | undefined,
  statement: string,
  opts: TellOptions,
): Promise<void> {
  const factsPath = join(repoPath, "qa-context", "facts.json");
  const store = FactStore.load(factsPath);
  const today = todayISO();
  store.markTimeStaleness(today);

  const result = applyTell(
    store,
    { unknownId, domain: opts.domain, statement, by: opts.by ?? "", source: opts.source, idSlug: opts.id },
    today,
  );

  store.save(factsPath);
  appendInterviewLog(repoPath, {
    date: today,
    by: result.fact.told_by ?? "",
    unknownId: result.fact.answers_unknown,
    question: result.question,
    domain: result.fact.domain,
    statement: result.fact.statement,
    factId: result.fact.id,
    scope: result.fact.scope ?? "repo",
  });

  console.log(`Recorded told fact ${result.fact.id} (scope: ${result.fact.scope ?? "repo"}).`);
  if (result.fact.answers_unknown) console.log(`Resolved unknown ${result.fact.answers_unknown}.`);
  console.log(`${result.remainingUnknowns} unknowns remain open. Run \`qa-boot generate\` to refresh context files.`);
}
```

- [ ] **Step 4: Register the command in `src/cli/index.ts`**

Add the import:

```ts
import { cmdTell } from "./commands/tell.js";
```

Add after the `generate` command registration (before `program.parseAsync()`):

```ts
program
  .command("tell <idOrStatement> [statement]")
  .description("Record human-told QA knowledge (answer an unknown by id, or add --domain knowledge)")
  .option("--domain <domain>", "domain for free-form knowledge")
  .option("--by <who>", "who provided this knowledge (required)")
  .option("--source <url>", "optional source link")
  .option("--id <slug>", "explicit id slug for free-form mode")
  .action(async (idOrStatement: string, statement: string | undefined, o) => {
    const isAnswer = statement !== undefined;
    await cmdTell(process.cwd(), isAnswer ? idOrStatement : undefined, isAnswer ? statement! : idOrStatement, {
      domain: o.domain,
      by: o.by,
      source: o.source,
      id: o.id,
    });
  });
```

(Two positionals → answer mode; one positional + `--domain` → free-form. `TellError` messages surface through the existing `parseAsync().catch` handler.)

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/cli/tell.test.ts` → PASS. Then `npm test`, `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/tell.ts src/cli/index.ts test/cli/tell.test.ts
git commit -m "feat: qa-boot tell command with end-to-end coverage"
```

---

## Task 9: Maturity rubric — told-answer boost

**Files:**
- Modify: `src/maturity/rubric.ts`
- Test: `test/maturity/rubric.test.ts` (append)

- [ ] **Step 1: Write failing tests**

Append to `test/maturity/rubric.test.ts` (reuse the existing `obs`/`makeFact` helpers in that file):

```ts
describe("scoreMaturity told-answer boost", () => {
  function toldAnswer(unknownId: string, domain: string) {
    return makeFact(
      {
        id: `${unknownId}.answer`, domain, statement: "answered", provenance: "told", confidence: 0.9,
        evidence_provider: "human-interview", answers_unknown: unknownId, expires_after_days: 180,
      },
      "2026-06-11",
    );
  }

  it("quality_ownership: codeowners (2) + told approvers -> 4", () => {
    const facts = [obs("knowledge_sources.codeowners", "knowledge_sources"), toldAnswer("ownership.approvers", "ownership")];
    const d = scoreMaturity(facts, "2026-06-11").find((f) => f.id === "maturity.quality_ownership")!;
    expect((d.value as any).score).toBe(4);
  });

  it("trust: told test_trust answer lifts 0 -> 2", () => {
    const facts = [toldAnswer("test_trust.confidence", "test_trust")];
    const d = scoreMaturity(facts, "2026-06-11").find((f) => f.id === "maturity.trust")!;
    expect((d.value as any).score).toBe(2);
  });

  it("release_readiness and agent_readiness boost by 2 capped at 5", () => {
    const facts = [
      obs("ci.has-deploy-job", "ci"),
      toldAnswer("release.blocking-gates", "release"),
      obs("agent_permissions.config.claude", "agent_permissions"),
      obs("agent_permissions.skills", "agent_permissions"),
      toldAnswer("agent_permissions.boundaries", "agent_permissions"),
    ];
    const out = scoreMaturity(facts, "2026-06-11");
    expect((out.find((f) => f.id === "maturity.release_readiness")!.value as any).score).toBe(3); // 1 + 2
    expect((out.find((f) => f.id === "maturity.agent_readiness")!.value as any).score).toBe(5); // 3 + 2
  });

  it("stale told answers do not boost", () => {
    const stale = { ...toldAnswer("ownership.approvers", "ownership"), stale: true };
    const facts = [obs("knowledge_sources.codeowners", "knowledge_sources"), stale];
    const d = scoreMaturity(facts, "2026-06-11").find((f) => f.id === "maturity.quality_ownership")!;
    expect((d.value as any).score).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/maturity/rubric.test.ts`
Expected: FAIL — scores are not boosted.

- [ ] **Step 3: Modify `src/maturity/rubric.ts`**

At the top of `scoreMaturity` (after `const ids = ...`):

```ts
  const toldAnswers = new Set(
    facts
      .filter((f) => f.provenance === "told" && f.answers_unknown && !f.stale)
      .map((f) => f.answers_unknown as string),
  );
  const boost = (score: number, unknownId: string): number =>
    toldAnswers.has(unknownId) ? Math.min(5, score + 2) : score;
```

Apply per dimension (change only the `score` expression lines):

- **Trust:** `const score = boost(coverage ? 2 : 0, "test_trust.confidence");` and in its `unknowns` array make the team-trust entry conditional: replace `"Team trust in tests unknown."` with a spread `...(toldAnswers.has("test_trust.confidence") ? [] : ["Team trust in tests unknown."])`.
- **Release readiness:** `const score = boost(deploy && releaseDocs ? 3 : deploy ? 1 : 0, "release.blocking-gates");`
- **Quality ownership:** `const score = boost(codeowners && template ? 3 : codeowners || template ? 2 : 0, "ownership.approvers");`
- **Agent readiness:** `const score = boost(config && skills ? 3 : config ? 2 : 0, "agent_permissions.boundaries");`

Discoverability and test_signal are unchanged.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/maturity/rubric.test.ts` → PASS (existing 5 + new 4). Then `npm test`, `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/maturity/rubric.ts test/maturity/rubric.test.ts
git commit -m "feat: maturity rubric counts non-stale told answers (+2 capped)"
```

---

## Task 10: Renderers — resurfaced-unknown history + CLAUDE.qa legend

**Files:**
- Modify: `src/generate/special-renderers.ts` (`renderUnknowns`)
- Modify: `src/generate/claude-qa.ts`
- Test: `test/generate/special-renderers.test.ts`, `test/generate/claude-qa.test.ts` (append; locate the real test file names with a glob first and append to whichever cover these renderers)

- [ ] **Step 1: Write failing tests**

Append to the test file covering `renderUnknowns`:

```ts
it("renders a previously-answered note when a stale told answer exists", () => {
  const unknown = makeFact(
    {
      id: "ownership.approvers", domain: "ownership", statement: "Who approves risky changes is unknown.",
      provenance: "unknown", confidence: 0, evidence_provider: "unknowns-generator",
      value: { question: "Who owns and approves risky changes in this repo?" },
    },
    "2026-06-11",
  );
  const staleTold = {
    ...makeFact(
      {
        id: "ownership.approvers.answer", domain: "ownership", statement: "QA guild approves.",
        provenance: "told", confidence: 0.9, evidence_provider: "human-interview",
        answers_unknown: "ownership.approvers", told_by: "murat",
      },
      "2025-12-01",
    ),
    stale: true,
  };
  const md = renderUnknowns([unknown, staleTold]);
  expect(md).toContain("Previously answered 2025-12-01 by murat");
  expect(md).toContain('"QA guild approves."');
  expect(md).toContain("re-confirm");
});
```

Append to the test file covering `renderClaudeQa`:

```ts
it("includes the told-provenance legend", () => {
  const md = renderClaudeQa({ hasRepoRisk: false });
  expect(md).toContain("told");
  expect(md).toContain("qa-interview-log.md");
});
```

(Adapt imports to those files' existing import style; add `makeFact` import where missing.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/generate` → the two new tests FAIL.

- [ ] **Step 3: Modify `src/generate/special-renderers.ts`**

In `renderUnknowns`, before the `byDomain` loop add:

```ts
  const staleAnswers = new Map(
    facts
      .filter((f) => f.provenance === "told" && f.stale && f.answers_unknown)
      .map((f) => [f.answers_unknown as string, f]),
  );
```

Inside the per-fact loop, after the `Ask a human` line is pushed, add:

```ts
      const prev = staleAnswers.get(f.id);
      if (prev) {
        lines.push(
          `  - Previously answered ${prev.last_verified} by ${prev.told_by ?? "unknown"}: "${prev.statement}" — please re-confirm or update via \`qa-boot tell\`.`,
        );
      }
```

- [ ] **Step 4: Modify `src/generate/claude-qa.ts`**

Add one line to the `Important:` list (after the "Do not treat technical repo risk..." line):

```ts
    "- Facts marked _told_ were stated by a human (see `qa-context/qa-interview-log.md`). Prefer them over inferred facts; if marked stale, re-confirm via the question in `unknowns.md` instead of assuming.",
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run test/generate` → PASS. Then `npm test`.

- [ ] **Step 6: Commit**

```bash
git add src/generate/special-renderers.ts src/generate/claude-qa.ts test/generate
git commit -m "feat: resurfaced-unknown history + told legend in rendered context"
```

---

## Task 11: Generated `qa-onboard` skill

**Files:**
- Modify: `src/generate/skills.ts`
- Test: `test/generate/skills.test.ts` (append; confirm real filename with a glob)

- [ ] **Step 1: Write failing test**

```ts
it("renders the qa-onboard skill with tell instructions", () => {
  const out = renderSkills({ hasRepoRisk: false });
  const skill = out[".claude/skills/qa-onboard/SKILL.md"];
  expect(skill).toBeDefined();
  expect(skill).toContain("qa-boot tell");
  expect(skill).toContain("--by");
  expect(skill).toContain("never your own inference");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run test/generate/skills.test.ts`
Expected: FAIL — no qa-onboard entry.

- [ ] **Step 3: Add the skill def to `src/generate/skills.ts`**

Append to the `defs` array (after `qa-release-readiness`):

```ts
    {
      name: "qa-onboard",
      description: "Interview a human to capture QA knowledge as told facts via qa-boot tell.",
      body: [
        "Interview the human to convert QA unknowns into recorded told facts.",
        "",
        "Phases:",
        "1. Precondition: if `qa-context/` or `qa-context/unknowns.md` is missing, say so and suggest `qa-boot scan`. Do not improvise context.",
        "2. Gather: if you lack baseline understanding of this repo, build it first — README, docs, repo structure, `qa-context/*.md`, `repo-risk.md` if present. Do not interview from ignorance.",
        "3. Play back: summarize your understanding to the human and let them correct it. Corrections are capturable answers.",
        "4. Interview: ask the open unknowns from `qa-context/unknowns.md` one question at a time, anchored in specifics you gathered. Then invite domain knowledge (environments, ownership, release, test data, business priority).",
        '5. Capture: after each human answer run `qa-boot tell <unknown-id> "<answer>" --by <name>` (or `qa-boot tell "<statement>" --domain <domain> --by <name>` for knowledge with no matching unknown). Record only what the human said or explicitly confirmed — never your own inference.',
        "6. Wrap: summarize what was captured, list remaining unknowns, and suggest `qa-boot scan` to refresh the generated context files.",
      ].join("\n"),
    },
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run test/generate/skills.test.ts` → PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/generate/skills.ts test/generate/skills.test.ts
git commit -m "feat: generated qa-onboard interview skill"
```

---

## Task 12: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Build, full suite, typecheck**

Run: `npm run build`, `npm test`, `npm run typecheck` — all clean, no regressions.

- [ ] **Step 2: Manual smoke (PowerShell, temp dir)**

```powershell
$d = Join-Path $env:TEMP "qa-boot-smoke-$(Get-Random)"; New-Item -ItemType Directory $d | Out-Null
Set-Content (Join-Path $d "README.md") "# smoke"
node dist/cli/index.js --help   # confirm tell appears
Push-Location $d
node <abs-path-to-qa-boot>/dist/cli/index.js scan --skip-qaradar
node <abs-path-to-qa-boot>/dist/cli/index.js tell ownership.approvers "QA guild approves risky changes." --by murat
node <abs-path-to-qa-boot>/dist/cli/index.js generate
Pop-Location
```

Verify in the temp dir: `qa-context/facts.json` contains `ownership.approvers.answer` with `"provenance": "told"`; `qa-context/qa-interview-log.md` exists with the Q/A entry; `qa-context/unknowns.md` no longer lists the approvers question; `.claude/skills/qa-onboard/SKILL.md` exists; the ownership-related maturity score reflects the boost in `qa-context/maturity.md`.

- [ ] **Step 3: Error-path smoke**

```powershell
node dist/cli/index.js tell nope.bogus "x" --by murat   # expect: error listing valid unknown ids, exit code 1
node dist/cli/index.js tell "x" --domain vibes --by murat  # expect: error listing valid domains
```

- [ ] **Step 4: Commit (only if fixes were needed) and finish**

```bash
git add -A
git commit -m "chore: told-facts onboarding verified end-to-end" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- Told fact schema (§4: provenance, told_by, scope, source, answers_unknown, 0.9, 180d) → Task 1 + Task 5. ✓
- `tell` CLI, two modes, validation, loud errors (§5) → Tasks 5 + 8. ✓
- Interview log (§6) → Task 6 (+ wired in Task 8). ✓
- Suppression by non-stale told answers + store-feeds-pipeline (§7) → Tasks 4 + 7. ✓
- Resurfacing with history (§7–8) → existing `markTimeStaleness` + Task 10 renderer. ✓
- CLAUDE.qa legend (§8) → Task 10. ✓
- Domain summaries (§8) → no change needed (verified: `renderKnownUnknown` already prints provenance + stale). ✓
- Rubric told boost (§9) → Task 9 (mapping decided: trust/test_trust, release_readiness/release.blocking-gates, quality_ownership/ownership.approvers, agent_readiness/agent_permissions.boundaries). ✓
- `qa-onboard` skill (§10) → Task 11. ✓
- Testing strategy (§11) → mirrored per task + Task 8 e2e + Task 12 smoke. ✓
- Forward-compat (§12) → scope/source fields (Task 1), no `--scope` flag, log entries self-contained (Task 6). ✓
- §13 deferred items: correctly absent from this plan. ✓

**Placeholder scan:** none — every code step has complete code. Two intentional "read the existing file first and match its helpers" notes (Tasks 7 Step 1, 8 Step 1, 10/11 test filenames) — these point at real existing files, with full assertion code provided.

**Type consistency:** `applyTell(store, input, today)` used identically in Tasks 5/8; `TellInput.idSlug` ↔ CLI `--id` mapping in Task 8; `answers_unknown` produced (Tasks 1/5) and consumed (Tasks 4/7/9/10) under the same name; `FactStore.remove` defined Task 3, used Task 5; `slug` defined Task 2, used Task 5; `priorFacts` param defined Task 7 and exercised by its test; `LogEntry` fields in Task 6 match the call in Task 8. ✓
