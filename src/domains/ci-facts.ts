import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "ci-scanner";

export function ciFacts(ev: RawEvidence[], today: string): Fact[] {
  const facts: Fact[] = [];

  for (const e of ev.filter((x) => x.kind === "ci-system")) {
    const name = String(e.detail?.name);
    facts.push(
      makeFact(
        {
          id: `ci.system.${name}`,
          domain: "ci",
          statement: `CI system ${name} detected.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
        },
        today,
      ),
    );
  }

  const jobs = ev.filter((x) => x.kind === "ci-job");
  const hasKind = (k: string) => jobs.some((j) => j.detail?.kind === k);

  if (hasKind("test")) {
    facts.push(
      makeFact(
        {
          id: "ci.runs-tests",
          domain: "ci",
          statement: "CI appears to run tests.",
          provenance: "inferred",
          confidence: 0.5,
          evidence_provider: PROVIDER,
          evidence: jobs.filter((j) => j.detail?.kind === "test").map((j) => j.path!).filter(Boolean),
          limitations: ["Job name suggests tests; not confirmed to block merges."],
        },
        today,
      ),
    );
  }
  if (hasKind("deploy")) {
    facts.push(
      makeFact(
        {
          id: "ci.has-deploy-job",
          domain: "release",
          statement: "A deploy/release job is present in CI.",
          provenance: "inferred",
          confidence: 0.5,
          evidence_provider: PROVIDER,
          evidence: jobs.filter((j) => j.detail?.kind === "deploy").map((j) => j.path!).filter(Boolean),
        },
        today,
      ),
    );
  }

  return facts;
}
