import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface LogEntry {
  date: string;
  by: string;
  unknownId?: string;
  question?: string;
  domain: string;
  statement: string;
  factId: string;
  scope: string;
}

const HEADER = "# QA Interview Log\n\nAppend-only record of human-told QA knowledge. Written by `qa-boot tell`; do not hand-edit.\n";

export function formatLogEntry(e: LogEntry): string {
  const lines = ["", `## ${e.date} — ${e.by}`];
  if (e.unknownId && e.question) {
    lines.push(`**Q (${e.unknownId}):** ${e.question}`, `**A:** ${e.statement}`);
  } else {
    lines.push(`**Told (${e.domain}):** ${e.statement}`);
  }
  lines.push(`→ fact \`${e.factId}\` (scope: ${e.scope})`, "");
  return lines.join("\n");
}

export function appendInterviewLog(repoPath: string, entry: LogEntry): string {
  const path = join(repoPath, "qa-context", "qa-interview-log.md");
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, HEADER, "utf8");
  appendFileSync(path, formatLogEntry(entry), "utf8");
  return path;
}
