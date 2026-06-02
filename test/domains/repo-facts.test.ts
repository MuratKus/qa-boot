import { describe, it, expect } from "vitest";
import { repoFacts } from "../../src/domains/repo-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

const ev: RawEvidence[] = [
  { kind: "language", path: "package.json", detail: { name: "javascript/typescript" } },
  { kind: "package-manager", path: "package.json", detail: { name: "npm" } },
  { kind: "readme", path: "README.md" },
];

describe("repoFacts", () => {
  it("creates observed language + package-manager facts", () => {
    const facts = repoFacts(ev, "2026-06-02");
    const lang = facts.find((f) => f.id === "repo.language.javascript/typescript")!;
    expect(lang.provenance).toBe("observed");
    expect(lang.confidence).toBe(0.8);
    expect(lang.evidence).toContain("package.json");
    expect(facts.some((f) => f.id === "repo.package-manager.npm")).toBe(true);
    expect(facts.some((f) => f.id === "repo.readme")).toBe(true);
  });

  it("returns no language fact when none present", () => {
    expect(repoFacts([], "2026-06-02").some((f) => f.domain === "repo")).toBe(false);
  });
});
