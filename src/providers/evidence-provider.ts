import type { ScanContext } from "../core/scan-context.js";

export interface EvidenceResult {
  provider: string;
  domain: string;
  statement: string;
  value?: unknown;
  evidence: string[];
  confidence: number;
  limitations?: string[];
  needsHumanConfirmation?: boolean;
}

export interface EvidenceProvider {
  name: string;
  isAvailable(ctx: ScanContext): Promise<boolean>;
  collect(ctx: ScanContext): Promise<EvidenceResult[]>;
}
