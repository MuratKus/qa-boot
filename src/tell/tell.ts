import type { Fact } from "../core/fact.js";
import { makeFact } from "../core/fact.js";
import type { FactStore } from "../core/fact-store.js";
import { slug } from "../core/slug.js";
import { knownUnknownIds, unknownSpec } from "../unknowns/unknowns.js";

export const TELLABLE_DOMAINS: readonly string[] = [
  "build",
  "release",
  "environment",
  "test_data",
  "ownership",
  "business_priority",
  "agent_permissions",
  "test_trust",
  "knowledge_sources",
];

export interface TellInput {
  unknownId?: string;
  domain?: string;
  statement: string;
  by: string;
  source?: string;
  idSlug?: string;
}

export interface TellResult {
  fact: Fact;
  question?: string;
  removedUnknown: boolean;
  remainingUnknowns: number;
}

export class TellError extends Error {}

export function applyTell(store: FactStore, input: TellInput, today: string): TellResult {
  if (!input.by?.trim()) throw new TellError("Missing --by <who>. Told facts must record who said them.");
  if (!input.statement?.trim()) throw new TellError("Missing statement text.");
  if (input.unknownId) return answerMode(store, input, today);
  if (input.domain) return freeformMode(store, input, today);
  throw new TellError(
    `Provide an unknown id to answer, or --domain for free-form knowledge.\nKnown unknown ids:\n  ${knownUnknownIds().join("\n  ")}`,
  );
}

function answerMode(store: FactStore, input: TellInput, today: string): TellResult {
  const spec = unknownSpec(input.unknownId!);
  if (!spec) {
    throw new TellError(
      `Unknown id "${input.unknownId}" is not one of qa-boot's unknowns. Valid ids:\n  ${knownUnknownIds().join("\n  ")}`,
    );
  }
  const fact = buildToldFact({ factId: `${spec.id}.answer`, domain: spec.domain, input, answersUnknown: spec.id }, today);
  const removedUnknown = store.remove(spec.id);
  store.upsert([fact]);
  return { fact, question: spec.question, removedUnknown, remainingUnknowns: countOpenUnknowns(store) };
}

function freeformMode(store: FactStore, input: TellInput, today: string): TellResult {
  const domain = input.domain!;
  if (!TELLABLE_DOMAINS.includes(domain)) {
    throw new TellError(`Domain "${domain}" is not tellable. Valid domains: ${TELLABLE_DOMAINS.join(", ")}`);
  }
  const s = input.idSlug ? slug(input.idSlug) : slug(input.statement);
  if (!s) throw new TellError("Could not derive an id from the statement; pass --id <slug>.");
  const factId = `${domain}.${s}`;
  if (unknownSpec(factId)) {
    throw new TellError(
      `Fact id "${factId}" collides with a known unknown. To answer that question run \`qa-boot tell ${factId} "..." --by <who>\`; otherwise pass --id <slug> to pick a different id.`,
    );
  }
  const existing = store.byId(factId);
  if (existing && existing.provenance !== "told") {
    throw new TellError(`Fact id "${factId}" already exists with provenance "${existing.provenance}". Pass --id <slug> to pick a different id.`);
  }
  const fact = buildToldFact({ factId, domain, input }, today);
  store.upsert([fact]);
  return { fact, removedUnknown: false, remainingUnknowns: countOpenUnknowns(store) };
}

function buildToldFact(
  args: { factId: string; domain: string; input: TellInput; answersUnknown?: string },
  today: string,
): Fact {
  return makeFact(
    {
      id: args.factId,
      domain: args.domain,
      statement: args.input.statement.trim(),
      provenance: "told",
      confidence: 0.9,
      evidence_provider: "human-interview",
      evidence: [`qa-interview-log.md ${today}`],
      limitations: ["Human-stated knowledge; may go stale. Re-confirm when expired."],
      expires_after_days: 180,
      told_by: args.input.by.trim(),
      scope: "repo",
      ...(args.input.source ? { source: args.input.source } : {}),
      ...(args.answersUnknown ? { answers_unknown: args.answersUnknown } : {}),
    },
    today,
  );
}

function countOpenUnknowns(store: FactStore): number {
  return store.all().filter((f) => f.provenance === "unknown").length;
}
