import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

const MARKERS: Array<[string, string]> = [
  ["CLAUDE.md", "CLAUDE.md"],
  ["AGENTS.md", "AGENTS.md"],
  [".claude/**", ".claude"],
  [".cursor/**", ".cursor"],
  [".cursorrules", ".cursorrules"],
];

export function scanAgentConfig(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];
  const seen = new Set<string>();
  for (const [glob, name] of MARKERS) {
    const hits = ctx.match(glob);
    if (hits.length && !seen.has(name)) {
      seen.add(name);
      ev.push({ kind: "agent-config", path: hits[0], detail: { name } });
    }
  }
  if (ctx.has(".claude/skills/**")) ev.push({ kind: "agent-skills", path: ".claude/skills" });
  if (ctx.has(".claude/**/*mcp*")) ev.push({ kind: "agent-mcp", path: ".claude" });
  return ev;
}
