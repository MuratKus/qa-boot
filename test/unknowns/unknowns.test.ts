import { describe, it, expect } from "vitest";
import { deriveUnknownFacts } from "../../src/unknowns/unknowns.js";
import { makeFact, type Fact } from "../../src/core/fact.js";

describe("deriveUnknownFacts", () => {
  it("emits build-process unknown when no build command facts exist", () => {
    const unknowns = deriveUnknownFacts([], "2026-06-02");
    const u = unknowns.find((f) => f.id === "build.qa-build-process")!;
    expect(u.provenance).toBe("unknown");
    expect(u.confidence).toBe(0);
    expect(u.value).toMatchObject({ question: expect.any(String) });
    expect(u.needs_human_confirmation).toBe(true);
  });

  it("still emits release/environment/ownership unknowns regardless of build facts", () => {
    const present: Fact[] = [
      makeFact({ id: "build.command.build", domain: "build", statement: "x", provenance: "observed", confidence: 0.8, evidence_provider: "build-scanner" }, "2026-06-02"),
    ];
    const ids = deriveUnknownFacts(present, "2026-06-02").map((f) => f.id);
    expect(ids).toContain("release.blocking-gates");
    expect(ids).toContain("environment.list");
    expect(ids).toContain("ownership.approvers");
    expect(ids).toContain("build.qa-build-process");
  });

  it("suppresses ownership.approvers when a CODEOWNERS knowledge_sources fact is present", () => {
    const present: Fact[] = [
      makeFact({ id: "knowledge_sources.codeowners", domain: "knowledge_sources", statement: "CODEOWNERS present.", provenance: "observed", confidence: 0.8, evidence_provider: "docs-scanner" }, "2026-06-02"),
    ];
    const ids = deriveUnknownFacts(present, "2026-06-02").map((f) => f.id);
    expect(ids).not.toContain("ownership.approvers");
    // the other unknowns are unaffected
    expect(ids).toContain("build.qa-build-process");
  });

  it("emits exactly the 8 specified unknowns when nothing is suppressed", () => {
    expect(deriveUnknownFacts([], "2026-06-02")).toHaveLength(8);
  });
});
