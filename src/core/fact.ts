export type Provenance = "observed" | "inferred" | "unknown";

export interface Fact {
  id: string;
  domain: string;
  statement: string;
  value: unknown | null;
  provenance: Provenance;
  confidence: number;
  evidence_provider: string;
  evidence_command: string;
  evidence: string[];
  limitations: string[];
  risk_if_wrong: string;
  needs_human_confirmation: boolean;
  last_verified: string; // YYYY-MM-DD
  expires_after_days: number;
  stale?: boolean;
  stale_reason?: string;
}

export interface MakeFactInput {
  id: string;
  domain: string;
  statement: string;
  provenance: Provenance;
  confidence: number;
  evidence_provider: string;
  value?: unknown | null;
  evidence_command?: string;
  evidence?: string[];
  limitations?: string[];
  risk_if_wrong?: string;
  needs_human_confirmation?: boolean;
  expires_after_days?: number;
}

export function todayISO(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function makeFact(input: MakeFactInput, today: string = todayISO()): Fact {
  return {
    id: input.id,
    domain: input.domain,
    statement: input.statement,
    value: input.value ?? null,
    provenance: input.provenance,
    confidence: input.confidence,
    evidence_provider: input.evidence_provider,
    evidence_command: input.evidence_command ?? "qa-boot scan",
    evidence: input.evidence ?? [],
    limitations: input.limitations ?? [],
    risk_if_wrong: input.risk_if_wrong ?? "",
    needs_human_confirmation: input.needs_human_confirmation ?? false,
    last_verified: today,
    expires_after_days: input.expires_after_days ?? 30,
  };
}
