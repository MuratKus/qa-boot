import { describe, it, expect } from "vitest";
import { ciFacts } from "../../src/domains/ci-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

describe("ciFacts", () => {
  it("creates ci system + job-kind facts", () => {
    const ev: RawEvidence[] = [
      { kind: "ci-system", path: ".github/workflows/ci.yml", detail: { name: "github-actions" } },
      { kind: "ci-job", path: ".github/workflows/ci.yml", detail: { name: "test", kind: "test" } },
    ];
    const facts = ciFacts(ev, "2026-06-02");
    expect(facts.find((f) => f.id === "ci.system.github-actions")!.provenance).toBe("observed");
    expect(facts.some((f) => f.id === "ci.runs-tests")).toBe(true);
  });

  it("no deploy fact when no deploy job", () => {
    const ev: RawEvidence[] = [
      { kind: "ci-system", path: "x", detail: { name: "github-actions" } },
    ];
    expect(ciFacts(ev, "2026-06-02").some((f) => f.id === "ci.has-deploy-job")).toBe(false);
  });
});
