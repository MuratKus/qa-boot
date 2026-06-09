import { describe, it, expect } from "vitest";
import { testFacts, qaradarTestFacts } from "../../src/domains/test-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";
import type { EvidenceResult } from "../../src/providers/evidence-provider.js";

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

describe("qaradarTestFacts", () => {
  const result: EvidenceResult = {
    provider: "qaradar",
    domain: "test",
    statement: "QA Radar mapped tests to source files.",
    value: { test_to_source_ratio: 1.0, files_with_tests: 11, files_without_tests: 3, source_files: 14, test_files: 14, coverage_status: "no_report_found" },
    evidence: ["qaradar test-to-source mapping"],
    confidence: 0.8,
  };

  it("maps a test EvidenceResult into an observed test.coverage-shape fact", () => {
    const f = qaradarTestFacts([result], "2026-06-08").find((x) => x.id === "test.coverage-shape")!;
    expect(f.domain).toBe("test");
    expect(f.provenance).toBe("observed");
    expect((f.value as any).files_with_tests).toBe(11);
  });

  it("returns [] when no test result is present", () => {
    expect(qaradarTestFacts([], "2026-06-08")).toEqual([]);
  });
});
