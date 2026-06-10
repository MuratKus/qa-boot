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

  it("rejects whitespace-only --by and statement", () => {
    expect(() => applyTell(new FactStore(), { unknownId: "ownership.approvers", statement: "s", by: "   " }, TODAY)).toThrow(/--by/);
    expect(() => applyTell(new FactStore(), { unknownId: "ownership.approvers", statement: "   ", by: "m" }, TODAY)).toThrow(/statement/i);
  });

  it("rejects a statement that slugs to nothing in free-form mode", () => {
    expect(() => applyTell(new FactStore(), { domain: "environment", statement: "!!! ???", by: "m" }, TODAY)).toThrow(/--id/);
  });

  it("free-form ids may not collide with known unknown ids", () => {
    expect(() => applyTell(new FactStore(), { domain: "environment", statement: "List", by: "m" }, TODAY)).toThrow(/collides with a known unknown/);
    expect(() => applyTell(new FactStore(), { domain: "ownership", statement: "x", by: "m", idSlug: "approvers" }, TODAY)).toThrow(
      /collides with a known unknown/,
    );
  });

  it("answer mode on an already-removed unknown reports removedUnknown false and stamps provenance", () => {
    const store = storeWithUnknown();
    applyTell(store, { unknownId: "ownership.approvers", statement: "First.", by: "murat" }, "2026-06-01");
    const r2 = applyTell(store, { unknownId: "ownership.approvers", statement: "Again.", by: "murat" }, TODAY);
    expect(r2.removedUnknown).toBe(false);
    expect(r2.fact.evidence_provider).toBe("human-interview");
  });
});
