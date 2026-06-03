import type { EvidenceResult } from "./evidence-provider.js";
import type { QaradarReport } from "./qaradar-contract.js";

export function parseQaradar(report: QaradarReport): EvidenceResult[] {
  const s = report.summary;
  if (!report.risky_modules.length && !report.untested_files.length) return [];

  const topRisky = report.risky_modules
    .slice()
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)
    .map((m) => ({ path: m.path, risk: m.risk_level, score: m.risk_score, reasons: m.reasons }));

  return [
    {
      provider: "qaradar",
      domain: "repo_quality",
      statement: "QA Radar flagged high-risk and/or untested files.",
      value: {
        critical_count: s.critical_risk_count,
        high_count: s.high_risk_count,
        files_without_tests: s.files_without_tests,
        coverage_status: s.coverage_status,
        top_risky: topRisky,
        untested_files: report.untested_files.slice(0, 20),
      },
      evidence: ["git history", "test-to-source mapping", report.summary.coverage_status === "ok" ? "coverage report" : "no coverage report"],
      confidence: 0.82,
      limitations: [
        "Business criticality is unknown.",
        "Risk is based on repository signals, not production impact.",
      ],
      needsHumanConfirmation: false,
    },
  ];
}
