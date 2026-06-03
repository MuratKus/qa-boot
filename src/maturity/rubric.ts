import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "maturity-rubric";

interface DimResult {
  id: string;
  score: number;
  explanation: string;
  evidence: string[];
  unknowns: string[];
  next_step: string;
}

export function scoreMaturity(facts: Fact[], today: string): Fact[] {
  const ids = facts.map((f) => f.id);
  const dims: DimResult[] = [];

  // Discoverability
  {
    const signals = [
      ids.includes("repo.readme"),
      ids.some((i) => i.startsWith("build.command.")),
      ids.some((i) => i.startsWith("ci.system.")),
      ids.some((i) => i.startsWith("knowledge_sources.docs-dir") || i.startsWith("knowledge_sources.contributing")),
      ids.some((i) => i.startsWith("agent_permissions.config.")),
    ];
    const n = signals.filter(Boolean).length;
    const score = signals[0] && signals[1] && signals[2] ? (n >= 5 ? 5 : 3) : signals[0] ? 1 : 0;
    dims.push({
      id: "maturity.discoverability",
      score,
      explanation: "Based on README, build files, CI config, docs, and agent config presence.",
      evidence: ids.filter((i) => i === "repo.readme" || i.startsWith("build.command.") || i.startsWith("ci.system.")),
      unknowns: n >= 5 ? [] : ["Onboarding docs and/or agent config may be missing."],
      next_step: "Ensure a README, build instructions, and CI are discoverable.",
    });
  }

  // Test signal
  {
    const hasTests = ids.some((i) => i.startsWith("test.framework.")) || ids.includes("test.directory");
    const runsTests = ids.includes("ci.runs-tests");
    const coverage = ids.includes("test.coverage-tool");
    const score = !hasTests ? 0 : coverage && runsTests ? 5 : runsTests ? 3 : 2;
    dims.push({
      id: "maturity.test_signal",
      score,
      explanation: "Based on test presence, CI running tests, and coverage artifacts.",
      evidence: ids.filter((i) => i.startsWith("test.")),
      unknowns: coverage ? [] : ["Coverage freshness is unknown."],
      next_step: "Confirm tests run in CI and whether coverage is current.",
    });
  }

  // Trust (capped at 2 in V0 — freshness is told knowledge)
  {
    const coverage = ids.includes("test.coverage-tool");
    const score = coverage ? 2 : 0;
    dims.push({
      id: "maturity.trust",
      score,
      explanation: "Trust depends on coverage freshness and flake handling, which are unknown in V0.",
      evidence: coverage ? ["test.coverage-tool"] : [],
      unknowns: ["Coverage freshness unknown.", "Flake handling unknown.", "Team trust in tests unknown."],
      next_step: "Capture whether the team trusts the suite and whether coverage is fresh.",
    });
  }

  // Release readiness
  {
    const deploy = ids.includes("ci.has-deploy-job");
    const releaseDocs = ids.some((i) => i.startsWith("knowledge_sources.changelog"));
    const score = deploy && releaseDocs ? 3 : deploy ? 1 : 0;
    dims.push({
      id: "maturity.release_readiness",
      score,
      explanation: "Based on deploy/release jobs and release docs. Blocking gates are unknown in V0.",
      evidence: ids.filter((i) => i === "ci.has-deploy-job" || i.startsWith("knowledge_sources.changelog")),
      unknowns: ["Release-blocking rules unknown."],
      next_step: "Document what blocks a release and who approves it.",
    });
  }

  // Quality ownership
  {
    const codeowners = ids.includes("knowledge_sources.codeowners");
    const template = ids.includes("knowledge_sources.pr-template") || ids.includes("knowledge_sources.issue-template");
    const score = codeowners && template ? 3 : codeowners || template ? 2 : 0;
    dims.push({
      id: "maturity.quality_ownership",
      score,
      explanation: "Based on CODEOWNERS and PR/issue templates. Explicit ownership facts are V1.5+.",
      evidence: ids.filter((i) => i.startsWith("knowledge_sources.codeowners") || i.includes("template")),
      unknowns: codeowners ? [] : ["Code ownership is unknown."],
      next_step: "Add CODEOWNERS and confirm approvers for risky areas.",
    });
  }

  // Agent readiness
  {
    const config = ids.some((i) => i.startsWith("agent_permissions.config."));
    const skills = ids.includes("agent_permissions.skills");
    const score = config && skills ? 3 : config ? 2 : 0;
    dims.push({
      id: "maturity.agent_readiness",
      score,
      explanation: "Based on agent config and existing skills. Permission boundaries are told knowledge (V1.5+).",
      evidence: ids.filter((i) => i.startsWith("agent_permissions.")),
      unknowns: ["Agent permission boundaries unknown."],
      next_step: "Define what an AI agent may do in this repo.",
    });
  }

  return dims.map((d) =>
    makeFact(
      {
        id: d.id,
        domain: "maturity",
        statement: `${d.id.split(".")[1]}: ${d.score}/5`,
        provenance: "inferred",
        confidence: 0.5,
        evidence_provider: PROVIDER,
        evidence: d.evidence,
        value: { score: d.score, max: 5, explanation: d.explanation, evidence: d.evidence, unknowns: d.unknowns, next_step: d.next_step },
      },
      today,
    ),
  );
}
