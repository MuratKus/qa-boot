import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "repo-scanner";

export function repoFacts(ev: RawEvidence[], today: string): Fact[] {
  const facts: Fact[] = [];

  for (const e of ev.filter((x) => x.kind === "language")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `repo.language.${name}`,
          domain: "repo",
          statement: `Repository uses ${name}.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
        },
        today,
      ),
    );
  }

  for (const e of ev.filter((x) => x.kind === "package-manager")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `repo.package-manager.${name}`,
          domain: "repo",
          statement: `Package manager ${name} detected.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
        },
        today,
      ),
    );
  }

  if (ev.some((e) => e.kind === "readme")) {
    facts.push(
      makeFact(
        {
          id: "repo.readme",
          domain: "repo",
          statement: "A README is present.",
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: ev.filter((e) => e.kind === "readme").map((e) => e.path!).filter(Boolean),
        },
        today,
      ),
    );
  }

  if (ev.some((e) => e.kind === "monorepo")) {
    facts.push(
      makeFact(
        {
          id: "repo.monorepo",
          domain: "repo",
          statement: "Monorepo workspace markers detected.",
          provenance: "inferred",
          confidence: 0.5,
          evidence_provider: PROVIDER,
          evidence: ev.filter((e) => e.kind === "monorepo").map((e) => e.path!).filter(Boolean),
        },
        today,
      ),
    );
  }

  return facts;
}
