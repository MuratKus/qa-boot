import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Fact } from "../core/fact.js";
import type { QaBootConfig } from "../config/config.js";
import { renderDomainSummaries } from "./domain-summaries.js";
import { renderUnknowns, renderRepoRisk, renderMaturity, renderQualityRisks, renderRefreshPolicy } from "./special-renderers.js";
import { renderClaudeQa } from "./claude-qa.js";
import { renderSkills } from "./skills.js";

export interface GenerateOptions {
  repoPath: string;
  config: QaBootConfig;
  claude: boolean;
}

function writeFile(repoPath: string, rel: string, content: string): void {
  const abs = join(repoPath, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

export function loadFacts(repoPath: string): Fact[] {
  const path = join(repoPath, "qa-context", "facts.json");
  if (!existsSync(path)) {
    throw new Error("qa-context/facts.json not found. Run `qa-boot scan` first.");
  }
  return (JSON.parse(readFileSync(path, "utf8")) as { facts: Fact[] }).facts ?? [];
}

export function runGenerate(opts: GenerateOptions): string[] {
  const facts = loadFacts(opts.repoPath);
  const written: string[] = [];
  const emit = (rel: string, content: string) => {
    writeFile(opts.repoPath, rel, content);
    written.push(rel);
  };

  for (const [rel, content] of Object.entries(renderDomainSummaries(facts))) emit(rel, content);
  emit("qa-context/unknowns.md", renderUnknowns(facts));
  emit("qa-context/maturity.md", renderMaturity(facts));
  emit("qa-context/quality-risks.md", renderQualityRisks(facts));
  emit("qa-context/refresh-policy.md", renderRefreshPolicy(opts.config));

  const repoRisk = renderRepoRisk(facts);
  const hasRepoRisk = repoRisk !== null;
  if (repoRisk) emit("qa-context/repo-risk.md", repoRisk);

  if (opts.claude && opts.config.claude.enabled) {
    emit("CLAUDE.qa.md", renderClaudeQa({ hasRepoRisk }));
    if (opts.config.claude.generate_skills) {
      for (const [rel, content] of Object.entries(renderSkills({ hasRepoRisk }))) emit(rel, content);
    }
  }

  return written;
}
