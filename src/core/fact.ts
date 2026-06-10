export type Provenance = "observed" | "inferred" | "unknown" | "told";
export type FactScope = "repo";

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
  told_by?: string;
  scope?: FactScope;
  source?: string | null;
  answers_unknown?: string;
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
  told_by?: string;
  scope?: FactScope;
  source?: string | null;
  answers_unknown?: string;
}

export function todayISO(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function makeFact(input: MakeFactInput, today: string = todayISO()): Fact {
  const f: Fact = {
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
  if (input.told_by !== undefined) f.told_by = input.told_by;
  if (input.scope !== undefined) f.scope = input.scope;
  if (input.source !== undefined) f.source = input.source;
  if (input.answers_unknown !== undefined) f.answers_unknown = input.answers_unknown;
  return f;
}
