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

describe("scoreMaturity V0.1 signals", () => {
  it("counts build.tool.* toward discoverability (Gradle/Make repos)", () => {
    const facts = [obs("repo.readme", "repo"), obs("build.tool.gradle", "build"), obs("ci.system.github-actions", "ci")];
    const disc = scoreMaturity(facts, "2026-06-08").find((f) => f.id === "maturity.discoverability")!;
    expect((disc.value as any).score).toBeGreaterThanOrEqual(3);
    expect((disc.value as any).evidence).toContain("build.tool.gradle");
  });

  it("treats a qaradar test.coverage-shape (files_with_tests>0) as tests existing", () => {
    const shape = makeFact({ id: "test.coverage-shape", domain: "test", statement: "shape", provenance: "observed", confidence: 0.8, evidence_provider: "qaradar", value: { files_with_tests: 5, coverage_status: "ok" } }, "2026-06-08");
    const facts = [shape, obs("ci.runs-tests", "ci")];
    const ts = scoreMaturity(facts, "2026-06-08").find((f) => f.id === "maturity.test_signal")!;
    expect((ts.value as any).score).toBeGreaterThanOrEqual(3);
  });
});

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
