import type { RawEvidence } from "../scanners/raw-evidence.js";
import { makeFact, type Fact } from "../core/fact.js";

const PROVIDER = "docs-scanner";

const LABEL: Record<string, string> = {
  readme: "README documentation",
  contributing: "Contributing guide",
  "docs-dir": "A docs/ directory",
  codeowners: "CODEOWNERS file",
  "pr-template": "Pull request template",
  "issue-template": "Issue template",
  changelog: "Changelog",
  adr: "Architecture decision records",
};

export function docsFacts(ev: RawEvidence[], today: string): Fact[] {
  return ev
    .filter((e) => e.kind === "doc")
    .map((e) => {
      const kind = String(e.detail?.kind);
      return makeFact(
        {
          id: `knowledge_sources.${kind}`,
          domain: "knowledge_sources",
          statement: `${LABEL[kind] ?? kind} is present.`,
          provenance: "observed",
          confidence: 0.8,
          evidence_provider: PROVIDER,
          evidence: e.path ? [e.path] : [],
        },
        today,
      );
    });
}
