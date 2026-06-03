import { join } from "node:path";
import { loadConfig } from "../../config/config.js";
import { buildScanContext } from "../../core/scan-context.js";
import { FactStore } from "../../core/fact-store.js";
import { todayISO } from "../../core/fact.js";
import { runScanDetailed } from "../../pipeline/run-scan.js";
import { cmdGenerate } from "./generate.js";

export interface ScanOptions {
  generate: boolean;
  claude: boolean;
  withQaradar: boolean;
  skipQaradar: boolean;
}

export async function cmdScan(repoPath: string, opts: ScanOptions): Promise<void> {
  const config = loadConfig(repoPath);
  if (opts.skipQaradar) config.evidence_providers.qaradar.enabled = "false";
  if (opts.withQaradar) config.evidence_providers.qaradar.enabled = "true";

  const ctx = buildScanContext(repoPath, config);
  const today = todayISO();
  const { facts } = await runScanDetailed(ctx, today, (m) => console.log(m));

  const factsPath = join(repoPath, "qa-context", "facts.json");
  const store = FactStore.load(factsPath);
  store.upsert(facts);
  store.markTimeStaleness(today);
  store.save(factsPath);
  console.log(`Wrote ${store.all().length} facts to qa-context/facts.json`);

  if (opts.generate) {
    await cmdGenerate(repoPath, { claude: opts.claude });
  }
}
