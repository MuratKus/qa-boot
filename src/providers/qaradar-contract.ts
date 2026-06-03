export interface QaradarRiskyModule {
  path: string;
  risk_level: "critical" | "high" | "medium" | "low";
  risk_score: number;
  reasons: string[];
}

export interface QaradarReport {
  summary: {
    repo: string;
    analyzed_at: string;
    source_files: number;
    test_files: number;
    test_to_source_ratio: number;
    avg_coverage: number | null;
    files_with_tests: number;
    files_without_tests: number;
    critical_risk_count: number;
    high_risk_count: number;
    coverage_status: "ok" | "no_report_found";
  };
  risky_modules: QaradarRiskyModule[];
  untested_files: string[];
  high_churn: Array<{ path: string; commits: number }>;
}
