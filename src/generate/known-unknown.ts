import type { Fact } from "../core/fact.js";

export function renderKnownUnknown(title: string, purpose: string, facts: Fact[]): string {
  const known = facts.filter((f) => f.provenance !== "unknown");
  const unknown = facts.filter((f) => f.provenance === "unknown");
  const lines: string[] = [`# ${title}`, "", purpose, ""];

  if (known.length === 0 && unknown.length > 0) {
    lines.push("## Unknown", "");
    for (const f of unknown) lines.push(...unknownLines(f));
    return lines.join("\n").trimEnd() + "\n";
  }

  if (known.length) {
    lines.push("## Known", "");
    for (const f of known) {
      const ev = f.evidence.length ? ` (evidence: ${f.evidence.map((e) => `\`${e}\``).join(", ")})` : "";
      const stale = f.stale ? " _[stale]_" : "";
      lines.push(`- ${f.statement} — _${f.provenance}, confidence ${f.confidence}_${ev}${stale}`);
    }
    lines.push("");
  }
  if (unknown.length) {
    lines.push("## Unknown", "");
    for (const f of unknown) lines.push(...unknownLines(f));
  }
  return lines.join("\n").trimEnd() + "\n";
}

function unknownLines(f: Fact): string[] {
  const q = (f.value as { question?: string } | null)?.question;
  const out = [`- ${f.statement}`];
  if (q) out.push(`  - **Ask a human:** ${q}`);
  return out;
}
