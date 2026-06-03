import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseQaradar } from "../../src/providers/qaradar-parse.js";
import type { QaradarReport } from "../../src/providers/qaradar-contract.js";

describe("parseQaradar", () => {
  it("produces a repo_quality EvidenceResult from the fixture", () => {
    const report = JSON.parse(readFileSync("fixtures/qaradar/sample.json", "utf8")) as QaradarReport;
    const results = parseQaradar(report);
    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.provider).toBe("qaradar");
    expect(r.domain).toBe("repo_quality");
    expect((r.value as any).critical_count).toBe(0);
    expect((r.value as any).high_count).toBe(3);
    expect((r.value as any).top_risky[0].path).toBe("qaradar/models.py");
    expect(r.limitations?.length).toBeGreaterThan(0);
  });

  it("returns empty array when there are no risky modules and no untested files", () => {
    const empty: QaradarReport = {
      summary: { repo: ".", analyzed_at: "x", source_files: 0, test_files: 0, test_to_source_ratio: 0, avg_coverage: null, files_with_tests: 0, files_without_tests: 0, critical_risk_count: 0, high_risk_count: 0, coverage_status: "no_report_found" },
      risky_modules: [],
      untested_files: [],
      high_churn: [],
    };
    expect(parseQaradar(empty)).toEqual([]);
  });
});
