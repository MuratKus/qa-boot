import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defaultConfig } from "../../config/config.js";

export interface InitOptions {
  projectName: string;
  claude: boolean;
  qaradar: "auto" | "true" | "false";
  force?: boolean;
}

const README = `# QA Context

This directory is generated and owned by \`qa-boot\`. Do not hand-edit these files —
they are regenerated from \`facts.json\` on every \`qa-boot generate\`.

- \`facts.json\` — the source of truth (written by \`qa-boot scan\`).
- \`unknowns.md\` — what QA Boot could not determine, with questions to ask a human.
- other \`*.md\` — per-domain summaries.
`;

export async function cmdInit(repoPath: string, opts: InitOptions): Promise<void> {
  const configPath = join(repoPath, "qa-boot.config.json");
  if (existsSync(configPath) && !opts.force) {
    throw new Error("qa-boot.config.json already exists. Pass --force to overwrite.");
  }
  const config = defaultConfig(opts.projectName);
  config.claude.enabled = opts.claude;
  config.evidence_providers.qaradar.enabled = opts.qaradar;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  mkdirSync(join(repoPath, "qa-context"), { recursive: true });
  writeFileSync(join(repoPath, "qa-context", "README.md"), README, "utf8");
}
