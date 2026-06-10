import { join } from "node:path";
import { FactStore } from "../../core/fact-store.js";
import { todayISO } from "../../core/fact.js";
import { applyTell } from "../../tell/tell.js";
import { appendInterviewLog } from "../../tell/interview-log.js";

export interface TellOptions {
  domain?: string;
  by?: string;
  source?: string;
  id?: string;
}

export async function cmdTell(
  repoPath: string,
  unknownId: string | undefined,
  statement: string,
  opts: TellOptions,
): Promise<void> {
  const factsPath = join(repoPath, "qa-context", "facts.json");
  const store = FactStore.load(factsPath);
  const today = todayISO();
  store.markTimeStaleness(today);

  const result = applyTell(
    store,
    { unknownId, domain: opts.domain, statement, by: opts.by ?? "", source: opts.source, idSlug: opts.id },
    today,
  );

  store.save(factsPath);
  appendInterviewLog(repoPath, {
    date: today,
    by: result.fact.told_by ?? "",
    unknownId: result.fact.answers_unknown,
    question: result.question,
    domain: result.fact.domain,
    statement: result.fact.statement,
    factId: result.fact.id,
    scope: result.fact.scope ?? "repo",
  });

  console.log(`Recorded told fact ${result.fact.id} (scope: ${result.fact.scope ?? "repo"}).`);
  if (result.fact.answers_unknown) console.log(`Resolved unknown ${result.fact.answers_unknown}.`);
  console.log(`${result.remainingUnknowns} unknowns remain open. Run \`qa-boot generate\` to refresh context files.`);
}
