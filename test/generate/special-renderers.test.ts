import { describe, it, expect } from "vitest";
import { renderUnknowns, renderRepoRisk, renderMaturity, renderQualityRisks, renderRefreshPolicy } from "../../src/generate/special-renderers.js";
import { makeFact, type Fact } from "../../src/core/fact.js";
import { defaultConfig } from "../../src/config/config.js";

const unknown = makeFact({ id: "build.qa-build-process", domain: "build", statement: "QA build process not found.", provenance: "unknown", confidence: 0, evidence_provider: "unknowns-generator", value: { question: "Who produces QA builds?" } }, "2026-06-02");
const repoQuality = makeFact({ id: "repo_quality.high-churn-untested", domain: "repo_quality", statement: "Risky files found.", provenance: "observed", confidence: 0.82, evidence_provider: "qaradar", value: { critical_count: 0, high_count: 3, top_risky: [{ path: "a.py", risk: "high", score: 0.6, reasons: ["No tests"] }] } }, "2026-06-02");
const maturity = makeFact({ id: "maturity.test_signal", domain: "maturity", statement: "test_signal: 3/5", provenance: "inferred", confidence: 0.5, evidence_provider: "maturity-rubric", value: { score: 3, max: 5, explanation: "tests run", evidence: ["test.directory"], unknowns: ["coverage freshness"], next_step: "confirm coverage" } }, "2026-06-02");

describe("special renderers", () => {
  it("groups unknowns by domain with questions", () => {
    const md = renderUnknowns([unknown]);
    expect(md).toContain("# Unknowns");
    expect(md).toContain("## build");
    expect(md).toContain("Ask a human: Who produces QA builds?");
  });

  it("renders repo-risk only when a repo_quality fact exists", () => {
    expect(renderRepoRisk([unknown])).toBeNull();
    const md = renderRepoRisk([repoQuality])!;
    expect(md).toContain("# Repository Risk Summary");
    expect(md).toContain("a.py");
    expect(md).toContain("technical risk view");
  });

  it("renders maturity scores with next steps", () => {
    const md = renderMaturity([maturity]);
    expect(md).toContain("## Test Signal: 3/5");
    expect(md).toContain("confirm coverage");
  });

  it("renders quality-risks synthesis", () => {
    expect(renderQualityRisks([repoQuality, unknown])).toContain("# Quality Risks");
  });

  it("renders refresh policy from config", () => {
    expect(renderRefreshPolicy(defaultConfig("svc"))).toContain("30");
  });

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
});
