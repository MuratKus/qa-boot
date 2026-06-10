import type { Fact } from "../core/fact.js";
import type { QaBootConfig } from "../config/config.js";

export function renderUnknowns(facts: Fact[]): string {
  const unknowns = facts.filter((f) => f.provenance === "unknown");
  const lines = ["# Unknowns", "", "Knowledge QA Boot could not determine. Ask a human before assuming.", ""];
  const staleAnswers = new Map(
    facts
      .filter((f) => f.provenance === "told" && f.stale && f.answers_unknown)
      .map((f) => [f.answers_unknown as string, f]),
  );
  const byDomain = new Map<string, Fact[]>();
  for (const f of unknowns) {
    const list = byDomain.get(f.domain) ?? [];
    list.push(f);
    byDomain.set(f.domain, list);
  }
  for (const domain of [...byDomain.keys()].sort()) {
    lines.push(`## ${domain}`, "");
    for (const f of byDomain.get(domain)!) {
      lines.push(`- ${f.statement}`);
      const q = (f.value as { question?: string } | null)?.question;
      if (q) lines.push(`  - Ask a human: ${q}`);
      const prev = staleAnswers.get(f.id);
      if (prev) {
        lines.push(
          `  - Previously answered ${prev.last_verified} by ${prev.told_by ?? "unknown"}: "${prev.statement}" — please re-confirm or update via \`qa-boot tell\`.`,
        );
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function renderRepoRisk(facts: Fact[]): string | null {
  const rq = facts.find((f) => f.id === "repo_quality.high-churn-untested");
  if (!rq) return null;
  const v = rq.value as {
    critical_count: number;
    high_count: number;
    top_risky: Array<{ path: string; risk: string; reasons: string[] }>;
  };
  const lines = [
    "# Repository Risk Summary",
    "",
    "Generated from deterministic repo analysis (QA Radar).",
    "",
    `Critical: ${v.critical_count} · High: ${v.high_count}`,
    "",
    "## Highest-risk areas",
    "",
  ];
  v.top_risky.forEach((m, i) => {
    lines.push(`${i + 1}. \`${m.path}\` (${m.risk})`);
    for (const r of m.reasons) lines.push(`   - ${r}`);
  });
  lines.push(
    "",
    "## Important limitation",
    "",
    "This is a technical risk view. It does not know business priority, customer impact, ownership, or release criticality unless captured elsewhere in QA context.",
  );
  return lines.join("\n").trimEnd() + "\n";
}

const TITLE: Record<string, string> = {
  discoverability: "Discoverability",
  test_signal: "Test Signal",
  trust: "Trust",
  release_readiness: "Release Readiness",
  quality_ownership: "Quality Ownership",
  agent_readiness: "Agent Readiness",
};

export function renderMaturity(facts: Fact[]): string {
  const dims = facts.filter((f) => f.domain === "maturity");
  const lines = ["# Maturity", "", "Deterministic rubric scores (0–5).", ""];
  for (const f of dims) {
    const v = f.value as { score: number; explanation: string; evidence: string[]; unknowns: string[]; next_step: string };
    const key = f.id.split(".")[1];
    lines.push(`## ${TITLE[key] ?? key}: ${v.score}/5`, "", v.explanation, "");
    if (v.evidence.length) lines.push("Evidence:", ...v.evidence.map((e) => `- \`${e}\``), "");
    if (v.unknowns.length) lines.push("Unknowns:", ...v.unknowns.map((u) => `- ${u}`), "");
    lines.push(`Next step:`, v.next_step, "");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export function renderQualityRisks(facts: Fact[]): string {
  const lines = ["# Quality Risks", "", "Synthesis of technical repo risk and explicit unknowns.", ""];
  const rq = facts.find((f) => f.id === "repo_quality.high-churn-untested");
  if (rq) lines.push("- Technical repo risk is available — see `repo-risk.md`.");
  else lines.push("- No QA Radar data; technical repo risk is unknown.");
  const unknownCount = facts.filter((f) => f.provenance === "unknown").length;
  lines.push(`- ${unknownCount} important unknowns recorded — see \`unknowns.md\`.`, "");
  return lines.join("\n").trimEnd() + "\n";
}

export function renderRefreshPolicy(config: QaBootConfig): string {
  return [
    "# Refresh Policy",
    "",
    `Facts expire after ${config.refresh.default_days} days and are then marked stale.`,
    "",
    "Re-run `qa-boot scan` to refresh facts. (V0 marks time-expired facts stale; the",
    "refresh diff and drop-on-absence rules arrive in V1.)",
    "",
  ].join("\n");
}
