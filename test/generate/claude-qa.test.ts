import { describe, it, expect } from "vitest";
import { renderClaudeQa } from "../../src/generate/claude-qa.js";

describe("renderClaudeQa", () => {
  it("includes guardrails and a repo-risk pointer when QA Radar ran", () => {
    const md = renderClaudeQa({ hasRepoRisk: true });
    expect(md).toContain("# QA Context Instructions");
    expect(md).toContain("qa-context/");
    expect(md).toContain("Do not assume");
    expect(md).toContain("repo-risk.md");
  });

  it("omits the repo-risk pointer when QA Radar did not run", () => {
    expect(renderClaudeQa({ hasRepoRisk: false })).not.toContain("repo-risk.md");
  });

  it("includes the told-provenance legend", () => {
    const md = renderClaudeQa({ hasRepoRisk: false });
    expect(md).toContain("told");
    expect(md).toContain("qa-interview-log.md");
  });

  it("includes reactive getting-started guidance without proactive onboarding", () => {
    const md = renderClaudeQa({ hasRepoRisk: false });
    expect(md).toContain("Getting started");
    expect(md).toContain("qa-onboard");
    expect(md).toContain("Do not start onboarding proactively");
  });
});
