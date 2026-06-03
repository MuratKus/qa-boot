import { describe, it, expect } from "vitest";
import { renderKnownUnknown } from "../../src/generate/known-unknown.js";
import { makeFact, type Fact } from "../../src/core/fact.js";

const known = (id: string, evidence: string[] = [], stale = false): Fact => {
  const f = makeFact({ id, domain: "test", statement: `${id} statement.`, provenance: "observed", confidence: 0.8, evidence_provider: "x", evidence }, "2026-06-02");
  if (stale) { f.stale = true; f.stale_reason = "expired"; }
  return f;
};
const unknownFact = (id: string, question: string): Fact =>
  makeFact({ id, domain: "test", statement: `${id} statement.`, provenance: "unknown", confidence: 0, evidence_provider: "u", value: { question } }, "2026-06-02");

describe("renderKnownUnknown", () => {
  it("all-unknown shape omits the Known header", () => {
    const md = renderKnownUnknown("Environments", "purpose", [unknownFact("environment.list", "What envs?")]);
    expect(md).toContain("# Environments");
    expect(md).toContain("## Unknown");
    expect(md).not.toContain("## Known");
    expect(md).toContain("**Ask a human:** What envs?");
  });

  it("renders both Known and Unknown sections for mixed facts", () => {
    const md = renderKnownUnknown("Test Stack", "purpose", [known("a", ["a.ts"]), unknownFact("b", "Why?")]);
    expect(md).toContain("## Known");
    expect(md).toContain("## Unknown");
    expect(md).toContain("a statement. — _observed, confidence 0.8_ (evidence: `a.ts`)");
  });

  it("marks stale facts in the Known list", () => {
    const md = renderKnownUnknown("Test Stack", "purpose", [known("a", ["a.ts"], true)]);
    expect(md).toContain("_[stale]_");
  });

  it("renders header and purpose only when there are no facts", () => {
    const md = renderKnownUnknown("Empty", "nothing here", []);
    expect(md).toContain("# Empty");
    expect(md).toContain("nothing here");
    expect(md).not.toContain("## Known");
    expect(md).not.toContain("## Unknown");
  });
});
