import { describe, it, expect } from "vitest";
import { scoreMaturity } from "../../src/maturity/rubric.js";
import { makeFact, type Fact } from "../../src/core/fact.js";

const obs = (id: string, domain: string): Fact =>
  makeFact({ id, domain, statement: id, provenance: "observed", confidence: 0.8, evidence_provider: "x", evidence: [id] }, "2026-06-02");

describe("scoreMaturity", () => {
  it("scores discoverability higher when readme+build+ci present", () => {
    const facts = [obs("repo.readme", "repo"), obs("build.command.build", "build"), obs("ci.system.github-actions", "ci")];
    const m = scoreMaturity(facts, "2026-06-02");
    const disc = m.find((f) => f.id === "maturity.discoverability")!;
    expect((disc.value as any).score).toBeGreaterThanOrEqual(3);
  });

  it("scores zero for a dimension with no signal", () => {
    const m = scoreMaturity([], "2026-06-02");
    const test = m.find((f) => f.id === "maturity.test_signal")!;
    expect((test.value as any).score).toBe(0);
  });

  it("emits all six dimensions", () => {
    expect(scoreMaturity([], "2026-06-02").map((f) => f.id).sort()).toEqual([
      "maturity.agent_readiness",
      "maturity.discoverability",
      "maturity.quality_ownership",
      "maturity.release_readiness",
      "maturity.test_signal",
      "maturity.trust",
    ]);
  });
});
