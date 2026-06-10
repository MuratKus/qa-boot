import type { ScanContext } from "../core/scan-context.js";
import type { Fact } from "../core/fact.js";
import { scanRepo } from "../scanners/repo-scanner.js";
import { scanTests } from "../scanners/test-scanner.js";
import { scanCi } from "../scanners/ci-scanner.js";
import { scanDocs } from "../scanners/docs-scanner.js";
import { scanBuild } from "../scanners/build-scanner.js";
import { scanAgentConfig } from "../scanners/agent-config-scanner.js";
import { repoFacts } from "../domains/repo-facts.js";
import { testFacts, qaradarTestFacts } from "../domains/test-facts.js";
import { ciFacts } from "../domains/ci-facts.js";
import { docsFacts } from "../domains/docs-facts.js";
import { buildFacts } from "../domains/build-facts.js";
import { agentFacts } from "../domains/agent-facts.js";
import { repoQualityFacts } from "../domains/repo-quality-facts.js";
import { deriveUnknownFacts } from "../unknowns/unknowns.js";
import { scoreMaturity } from "../maturity/rubric.js";
import { qaradarProvider } from "../providers/qaradar-provider.js";

export interface RunScanResult {
  facts: Fact[];
  qaradarRan: boolean;
}

export async function runScan(ctx: ScanContext, today: string, log: (m: string) => void = () => {}, priorFacts: Fact[] = []): Promise<Fact[]> {
  const result = await runScanDetailed(ctx, today, log, priorFacts);
  return result.facts;
}

export async function runScanDetailed(ctx: ScanContext, today: string, log: (m: string) => void = () => {}, priorFacts: Fact[] = []): Promise<RunScanResult> {
  const deterministic: Fact[] = [
    ...repoFacts(scanRepo(ctx), today),
    ...testFacts(scanTests(ctx), today),
    ...ciFacts(scanCi(ctx), today),
    ...docsFacts(scanDocs(ctx), today),
    ...buildFacts(scanBuild(ctx), today),
    ...agentFacts(scanAgentConfig(ctx), today),
  ];

  let qaradarRan = false;
  let qaFacts: Fact[] = [];
  try {
    if (await qaradarProvider.isAvailable(ctx)) {
      const results = await qaradarProvider.collect(ctx);
      qaFacts = [...repoQualityFacts(results, today), ...qaradarTestFacts(results, today)];
      qaradarRan = results.length > 0;
      if (results.length === 0) {
        log("QA Radar ran but found no usable data (e.g. no commits or no risk signals). Continuing with built-in scanners.");
      }
    } else {
      log("QA Radar not available. Continuing with built-in scanners.");
    }
  } catch {
    log("QA Radar run failed. Continuing with built-in scanners.");
  }

  const base = [...deterministic, ...qaFacts, ...priorFacts];
  const unknowns = deriveUnknownFacts(base, today);
  const withUnknowns = [...base, ...unknowns];
  const maturity = scoreMaturity(withUnknowns, today);

  return { facts: [...withUnknowns, ...maturity], qaradarRan };
}
