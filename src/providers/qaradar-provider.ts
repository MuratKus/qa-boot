import { spawnSync } from "node:child_process";
import type { EvidenceProvider, EvidenceResult } from "./evidence-provider.js";
import type { QaradarReport } from "./qaradar-contract.js";
import { parseQaradar } from "./qaradar-parse.js";
import { qaradarEnabled } from "../config/config.js";

function which(): boolean {
  const probe = spawnSync("qaradar", ["--version"], { encoding: "utf8" });
  return probe.status === 0;
}

export const qaradarProvider: EvidenceProvider = {
  name: "qaradar",

  async isAvailable(ctx) {
    if (qaradarEnabled(ctx.config) === "false") return false;
    return which();
  },

  async collect(ctx) {
    const { days, top } = ctx.config.evidence_providers.qaradar;
    const run = spawnSync(
      "qaradar",
      ["analyze", ctx.repoPath, "--json-output", "--days", String(days), "--top", String(top)],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    if (run.status !== 0 || !run.stdout) {
      return [];
    }
    let report: QaradarReport;
    try {
      report = JSON.parse(run.stdout) as QaradarReport;
    } catch {
      return [];
    }
    return parseQaradar(report) as EvidenceResult[];
  },
};
