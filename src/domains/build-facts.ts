import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "build-scanner";

export function buildFacts(ev: RawEvidence[], today: string): Fact[] {
  const facts: Fact[] = [];

  for (const e of ev.filter((x) => x.kind === "build-command")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `build.command.${name}`,
          domain: "build",
          statement: `A "${name}" command is defined.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
          value: { command: String(e.detail?.cmd) },
        },
        today,
      ),
    );
  }

  for (const e of ev.filter((x) => x.kind === "build-file")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `build.tool.${name}`,
          domain: "build",
          statement: `Build tooling detected: ${name}.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
        },
        today,
      ),
    );
  }

  return facts;
}
