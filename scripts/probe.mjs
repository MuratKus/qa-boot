// Dev-only, read-only breadth probe. Not committed. Runs the scan pipeline
// against a repo path and prints a fact summary WITHOUT writing into the repo.
import { buildScanContext } from "../dist/core/scan-context.js";
import { normalizeConfig } from "../dist/config/config.js";
import { runScanDetailed } from "../dist/pipeline/run-scan.js";
import { todayISO } from "../dist/core/fact.js";

const repoPath = process.argv[2];
const withQaradar = process.argv[3] !== "--no-qaradar";

const config = normalizeConfig({
  project_name: "probe",
  evidence_providers: { qaradar: { enabled: withQaradar ? "auto" : "false" } },
});

const ctx = buildScanContext(repoPath, config);
const { facts, qaradarRan } = await runScanDetailed(ctx, todayISO(), (m) => console.log("  [log]", m));

const by = (domain) => facts.filter((f) => f.domain === domain).map((f) => f.id);
const ids = facts.map((f) => f.id);
const unknowns = facts.filter((f) => f.provenance === "unknown");

console.log(`\n=== ${repoPath} ===`);
console.log(`total facts: ${facts.length}  | qaradar ran: ${qaradarRan}`);
console.log(`repo:        ${ids.filter((i) => i.startsWith("repo.")).join(", ") || "(none)"}`);
console.log(`test:        ${ids.filter((i) => i.startsWith("test.")).join(", ") || "(none)"}`);
console.log(`ci/release:  ${ids.filter((i) => i.startsWith("ci.") || i === "ci.has-deploy-job").join(", ") || "(none)"}`);
console.log(`build:       ${by("build").join(", ") || "(none)"}`);
console.log(`docs:        ${by("knowledge_sources").join(", ") || "(none)"}`);
console.log(`agent:       ${by("agent_permissions").filter((i) => i.startsWith("agent_permissions.config") || i === "agent_permissions.skills").join(", ") || "(none)"}`);
const rq = facts.find((f) => f.id === "repo_quality.high-churn-untested");
if (rq) {
  const v = rq.value;
  console.log(`repo_quality: critical=${v.critical_count} high=${v.high_count} top=${(v.top_risky || []).slice(0, 3).map((m) => m.path).join(" | ")}`);
}
console.log(`unknowns:    ${unknowns.length} (${[...new Set(unknowns.map((f) => f.domain))].join(", ")})`);
const mats = facts.filter((f) => f.domain === "maturity").map((f) => `${f.id.split(".")[1]}=${f.value.score}`);
console.log(`maturity:    ${mats.join("  ")}`);
