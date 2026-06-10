import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";
import { slug } from "../core/slug.js";

const PROVIDER = "agent-config-scanner";

export function agentFacts(ev: RawEvidence[], today: string): Fact[] {
  const facts: Fact[] = [];

  for (const e of ev.filter((x) => x.kind === "agent-config")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `agent_permissions.config.${slug(name)}`,
          domain: "agent_permissions",
          statement: `Agent config ${name} is present.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
          limitations: ["Presence does not define what the agent is permitted to do."],
        },
        today,
      ),
    );
  }

  if (ev.some((e) => e.kind === "agent-skills")) {
    facts.push(
      makeFact(
        {
          id: "agent_permissions.skills",
          domain: "agent_permissions",
          statement: "Existing Claude skills were detected.",
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: [".claude/skills"],
        },
        today,
      ),
    );
  }

  return facts;
}
