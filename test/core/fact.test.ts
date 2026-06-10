import { describe, it, expect } from "vitest";
import { makeFact } from "../../src/core/fact.js";

describe("makeFact", () => {
  it("stamps defaults and required fields", () => {
    const f = makeFact(
      {
        id: "test.framework.playwright",
        domain: "test",
        statement: "Playwright detected.",
        provenance: "observed",
        confidence: 0.8,
        evidence_provider: "test-scanner",
        evidence: ["playwright.config.ts"],
      },
      "2026-06-02",
    );
    expect(f.value).toBeNull();
    expect(f.evidence_command).toBe("qa-boot scan");
    expect(f.limitations).toEqual([]);
    expect(f.risk_if_wrong).toBe("");
    expect(f.needs_human_confirmation).toBe(false);
    expect(f.last_verified).toBe("2026-06-02");
    expect(f.expires_after_days).toBe(30);
  });

  it("keeps explicit overrides", () => {
    const f = makeFact(
      {
        id: "build.android.qa",
        domain: "build",
        statement: "Unknown.",
        provenance: "unknown",
        confidence: 0,
        evidence_provider: "build-scanner",
        evidence: [],
        needs_human_confirmation: true,
        risk_if_wrong: "Wrong build steps.",
        expires_after_days: 14,
      },
      "2026-06-02",
    );
    expect(f.needs_human_confirmation).toBe(true);
    expect(f.risk_if_wrong).toBe("Wrong build steps.");
    expect(f.expires_after_days).toBe(14);
  });
});

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
