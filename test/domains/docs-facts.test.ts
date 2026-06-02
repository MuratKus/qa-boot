import { describe, it, expect } from "vitest";
import { docsFacts } from "../../src/domains/docs-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

describe("docsFacts", () => {
  it("maps each doc marker to a knowledge_sources fact", () => {
    const ev: RawEvidence[] = [
      { kind: "doc", path: "README.md", detail: { kind: "readme" } },
      { kind: "doc", path: "CODEOWNERS", detail: { kind: "codeowners" } },
    ];
    const facts = docsFacts(ev, "2026-06-02");
    expect(facts.find((f) => f.id === "knowledge_sources.readme")!.provenance).toBe("observed");
    expect(facts.some((f) => f.id === "knowledge_sources.codeowners")).toBe(true);
  });
});
