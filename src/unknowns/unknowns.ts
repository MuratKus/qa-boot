import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "unknowns-generator";

interface UnknownSpec {
  id: string;
  domain: string;
  statement: string;
  question: string;
  risk_if_wrong: string;
  /** If any fact id-prefix here exists, suppress this unknown. Empty = always emit. */
  suppressIfPrefix?: string[];
}

const SPECS: UnknownSpec[] = [
  {
    id: "build.qa-build-process",
    domain: "build",
    statement: "The QA build / artifact generation process was not found.",
    question: "Who or what system produces QA builds, where are artifacts stored, and who owns that workflow?",
    risk_if_wrong: "The agent may invent wrong build instructions or point QA at the wrong artifact.",
  },
  {
    id: "release.blocking-gates",
    domain: "release",
    statement: "It is unclear which checks block a release.",
    question: "Which CI checks or approvals actually block a release, and who can override them?",
    risk_if_wrong: "The agent may claim a change is releasable when a real gate is unmet.",
  },
  {
    id: "environment.list",
    domain: "environment",
    statement: "Which environments exist and which is stable is unknown.",
    question: "What test environments exist (dev/staging/prod), which is stable, and how is test data reset?",
    risk_if_wrong: "The agent may direct QA to test on an unstable or wrong environment.",
  },
  {
    id: "test_data.reset-process",
    domain: "test_data",
    statement: "The test data setup/reset process is unknown.",
    question: "How is test data created and reset, and are there fixtures or seed scripts?",
    risk_if_wrong: "The agent may assume a clean dataset that does not exist.",
  },
  {
    id: "ownership.approvers",
    domain: "ownership",
    statement: "Who approves risky changes is unknown.",
    question: "Who owns and approves risky changes in this repo?",
    risk_if_wrong: "The agent may route review to the wrong people or skip required approval.",
    suppressIfPrefix: ["knowledge_sources.codeowners"],
  },
  {
    id: "business_priority.critical-areas",
    domain: "business_priority",
    statement: "Business criticality of repo areas is unknown.",
    question: "Which areas of this repo are business-critical or customer-facing?",
    risk_if_wrong: "The agent may treat technical risk as business priority.",
  },
  {
    id: "agent_permissions.boundaries",
    domain: "agent_permissions",
    statement: "What an AI agent is permitted to do here is unknown.",
    question: "What is an AI agent allowed to do in this repo (comment on PRs, trigger CI, open PRs)?",
    risk_if_wrong: "The agent may take an action it is not authorized to take.",
  },
  {
    id: "test_trust.confidence",
    domain: "test_trust",
    statement: "Whether the team trusts the existing tests is unknown.",
    question: "Do you trust the current test suite, and are failures treated as real?",
    risk_if_wrong: "The agent may over-trust a flaky or ignored suite.",
  },
  {
    id: "repo_quality.risk-analysis",
    domain: "repo_quality",
    statement: "Deterministic repo-risk analysis (QA Radar) was not available, so technical risk hotspots are unknown.",
    question: "Is QA Radar (or similar churn/coverage risk analysis) available to run on this repo?",
    risk_if_wrong: "The agent may give generic 'what to test first' advice without knowing where technical risk concentrates.",
    suppressIfPrefix: ["repo_quality.high-churn-untested"],
  },
];

export function deriveUnknownFacts(facts: Fact[], today: string): Fact[] {
  const ids = facts.map((f) => f.id);
  const out: Fact[] = [];
  for (const spec of SPECS) {
    const suppressed = (spec.suppressIfPrefix ?? []).some((p) => ids.some((id) => id.startsWith(p)));
    if (suppressed) continue;
    out.push(
      makeFact(
        {
          id: spec.id,
          domain: spec.domain,
          statement: spec.statement,
          provenance: "unknown",
          confidence: 0,
          evidence_provider: PROVIDER,
          evidence: [],
          value: { question: spec.question },
          risk_if_wrong: spec.risk_if_wrong,
          needs_human_confirmation: true,
        },
        today,
      ),
    );
  }
  return out;
}
