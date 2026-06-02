import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

const DOC_MARKERS: Array<[string, string]> = [
  ["README*", "readme"],
  ["CONTRIBUTING*", "contributing"],
  ["docs/**", "docs-dir"],
  ["CODEOWNERS", "codeowners"],
  [".github/CODEOWNERS", "codeowners"],
  [".github/PULL_REQUEST_TEMPLATE*", "pr-template"],
  [".github/ISSUE_TEMPLATE/**", "issue-template"],
  ["CHANGELOG*", "changelog"],
  ["docs/decisions/**", "adr"],
  ["docs/adr/**", "adr"],
];

export function scanDocs(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];
  const seen = new Set<string>();
  for (const [glob, kind] of DOC_MARKERS) {
    const hits = ctx.match(glob);
    if (hits.length && !seen.has(kind)) {
      seen.add(kind);
      ev.push({ kind: "doc", path: hits[0], detail: { kind } });
    }
  }
  return ev;
}
