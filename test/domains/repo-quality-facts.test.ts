import { describe, it, expect } from "vitest";
import { repoQualityFacts } from "../../src/domains/repo-quality-facts.js";
import type { EvidenceResult } from "../../src/providers/evidence-provider.js";

const result: EvidenceResult = {
  provider: "qaradar",
  domain: "repo_quality",
  statement: "QA Radar flagged high-risk and/or untested files.",
  value: { critical_count: 0, high_count: 3, top_risky: [{ path: "a.py", risk: "high", score: 0.6, reasons: [] }], untested_files: ["a.py"] },
  evidence: ["git history"],
  confidence: 0.82,
  limitations: ["Business criticality is unknown."],
};

describe("repoQualityFacts", () => {
  it("maps an EvidenceResult into an observed repo_quality fact + risk unknowns", () => {
    const facts = repoQualityFacts([result], "2026-06-02");
    const main = facts.find((f) => f.id === "repo_quality.high-churn-untested")!;
    expect(main.provenance).toBe("observed");
    expect(main.confidence).toBe(0.82);
    expect(facts.some((f) => f.domain === "business_priority" && f.provenance === "unknown")).toBe(true);
  });

  it("returns empty for no results", () => {
    expect(repoQualityFacts([], "2026-06-02")).toEqual([]);
  });
});
