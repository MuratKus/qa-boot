import { describe, it, expect } from "vitest";
import { testFacts } from "../../src/domains/test-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

describe("testFacts", () => {
  it("creates observed framework facts from config evidence", () => {
    const ev: RawEvidence[] = [
      { kind: "test-framework", path: "playwright.config.ts", detail: { name: "playwright", source: "config" } },
      { kind: "test-dir", path: "e2e/" },
    ];
    const facts = testFacts(ev, "2026-06-02");
    const f = facts.find((x) => x.id === "test.framework.playwright")!;
    expect(f.provenance).toBe("observed");
    expect(f.confidence).toBe(0.8);
    expect(facts.some((x) => x.id === "test.directory")).toBe(true);
  });

  it("dependency-sourced frameworks are inferred (0.5)", () => {
    const ev: RawEvidence[] = [
      { kind: "test-framework", path: "package.json", detail: { name: "jest", source: "dependency" } },
    ];
    expect(testFacts(ev, "2026-06-02").find((x) => x.id === "test.framework.jest")!.confidence).toBe(0.5);
  });

  it("build-file sourced frameworks are inferred (0.5) with a limitation", () => {
    const ev: RawEvidence[] = [
      { kind: "test-framework", path: "build.gradle.kts", detail: { name: "junit", source: "build-file" } },
    ];
    const f = testFacts(ev, "2026-06-08").find((x) => x.id === "test.framework.junit")!;
    expect(f.provenance).toBe("inferred");
    expect(f.confidence).toBe(0.5);
    expect(f.limitations.length).toBeGreaterThan(0);
  });
});
