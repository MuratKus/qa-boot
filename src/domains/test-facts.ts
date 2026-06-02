import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "test-scanner";

export function testFacts(ev: RawEvidence[], today: string): Fact[] {
  const facts: Fact[] = [];

  for (const e of ev.filter((x) => x.kind === "test-framework")) {
    const name = String(e.detail?.name);
    const observed = e.detail?.source === "config";
    facts.push(
      makeFact(
        {
          id: `test.framework.${name}`,
          domain: "test",
          statement: `Test framework ${name} detected.`,
          provenance: observed ? "observed" : "inferred",
          confidence: observed ? 0.8 : 0.5,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
          limitations: observed ? [] : ["Detected via dependency only; not confirmed running."],
        },
        today,
      ),
    );
  }

  const dirs = ev.filter((x) => x.kind === "test-dir");
  if (dirs.length) {
    facts.push(
      makeFact(
        {
          id: "test.directory",
          domain: "test",
          statement: "Test directories are present.",
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: dirs.map((d) => d.path!).filter(Boolean),
        },
        today,
      ),
    );
  }

  const cov = ev.filter((x) => x.kind === "coverage-tool");
  if (cov.length) {
    facts.push(
      makeFact(
        {
          id: "test.coverage-tool",
          domain: "test",
          statement: "A coverage tool/artifact was detected.",
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: cov.map((c) => String(c.detail?.name)),
          limitations: ["Coverage freshness is unknown."],
        },
        today,
      ),
    );
  }

  return facts;
}
