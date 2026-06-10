import { describe, it, expect } from "vitest";
import { renderDomainSummaries } from "../../src/generate/domain-summaries.js";
import { makeFact, type Fact } from "../../src/core/fact.js";

const facts: Fact[] = [
  makeFact({ id: "test.framework.playwright", domain: "test", statement: "Playwright detected.", provenance: "observed", confidence: 0.8, evidence_provider: "test-scanner", evidence: ["playwright.config.ts"] }, "2026-06-02"),
  makeFact({ id: "environment.list", domain: "environment", statement: "Environments unknown.", provenance: "unknown", confidence: 0, evidence_provider: "unknowns-generator", value: { question: "What environments exist?" } }, "2026-06-02"),
];

describe("renderDomainSummaries", () => {
  it("renders test-stack.md with a Known section citing evidence", () => {
    const files = renderDomainSummaries(facts);
    const ts = files["qa-context/test-stack.md"];
    expect(ts).toContain("# Test Stack");
    expect(ts).toContain("Playwright detected.");
    expect(ts).toContain("playwright.config.ts");
  });

  it("renders environments.md in all-unknown shape with the human question", () => {
    const files = renderDomainSummaries(facts);
    const env = files["qa-context/environments.md"];
    expect(env).toContain("## Unknown");
    expect(env).toContain("Ask a human:");
    expect(env).toContain("What environments exist?");
  });

  it("renders ownership and agent-permissions summaries including told facts", () => {
    const told = makeFact(
      {
        id: "ownership.approvers.answer", domain: "ownership", statement: "QA guild approves risky changes.",
        provenance: "told", confidence: 0.9, evidence_provider: "human-interview", told_by: "murat",
      },
      "2026-06-11",
    );
    const out = renderDomainSummaries([told]);
    expect(out["qa-context/ownership.md"]).toContain("QA guild approves risky changes.");
    expect(out["qa-context/ownership.md"]).toContain("told");
    expect(out["qa-context/agent-permissions.md"]).toBeDefined();
  });
});
