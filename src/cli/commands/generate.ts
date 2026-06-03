import { loadConfig } from "../../config/config.js";
import { runGenerate } from "../../generate/generate.js";

export interface GenerateCmdOptions {
  claude: boolean;
}

export async function cmdGenerate(repoPath: string, opts: GenerateCmdOptions): Promise<void> {
  const config = loadConfig(repoPath);
  const written = runGenerate({ repoPath, config, claude: opts.claude });
  console.log(`Generated ${written.length} files.`);
}
