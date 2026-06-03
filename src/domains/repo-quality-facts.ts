import type { EvidenceResult } from "../providers/evidence-provider.js";
import { makeFact, type Fact } from "../core/fact.js";

export function repoQualityFacts(results: EvidenceResult[], today: string): Fact[] {
  const rq = results.find((r) => r.domain === "repo_quality");
  if (!rq) return [];

  const facts: Fact[] = [
    makeFact(
      {
        id: "repo_quality.high-churn-untested",
        domain: "repo_quality",
        statement: rq.statement,
        provenance: "observed",
        confidence: rq.confidence,
        evidence_provider: rq.provider,
        evidence_command: "qaradar analyze . --json-output",
        evidence: rq.evidence,
        value: rq.value,
        limitations: rq.limitations ?? [],
        risk_if_wrong: "The agent may prioritize technically risky files that are not the most business-critical.",
      },
      today,
    ),
    makeFact(
      {
        id: "business_priority.vs-repo-risk",
        domain: "business_priority",
        statement: "Repo risk is known technically, but business criticality of those files is unknown.",
        provenance: "unknown",
        confidence: 0,
        evidence_provider: "qaradar",
        evidence: [],
        value: { question: "Which of the technically risky files are business-critical or customer-facing?" },
        risk_if_wrong: "The agent may treat technical risk as business priority.",
        needs_human_confirmation: true,
      },
      today,
    ),
  ];

  return facts;
}
