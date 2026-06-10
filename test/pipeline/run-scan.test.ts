import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { runScan } from "../../src/pipeline/run-scan.js";
import { buildScanContext } from "../../src/core/scan-context.js";
import { normalizeConfig } from "../../src/config/config.js";
import { makeFact } from "../../src/core/fact.js";

function qaradarInstalled(): boolean {
  try { execSync("qaradar --version", { stdio: "ignore" }); return true; } catch { return false; }
}

describe("runScan", () => {
  it("produces facts from the node fixture without QA Radar", async () => {
    const ctx = buildScanContext("test-fixtures/repos/node-playwright", normalizeConfig({ evidence_providers: { qaradar: { enabled: "false" } } as any }));
    const facts = await runScan(ctx, "2026-06-02");
    expect(facts.some((f) => f.id === "test.framework.playwright")).toBe(true);
    expect(facts.some((f) => f.provenance === "unknown")).toBe(true);
    expect(facts.some((f) => f.domain === "maturity")).toBe(true);
  });
});

describe("runScan with prior told facts", () => {
  it("includes told facts and suppresses the answered unknown", async () => {
    const told = makeFact(
      {
        id: "ownership.approvers.answer", domain: "ownership", statement: "QA guild approves.",
        provenance: "told", confidence: 0.9, evidence_provider: "human-interview",
        answers_unknown: "ownership.approvers", expires_after_days: 180, told_by: "murat", scope: "repo",
      },
      "2026-06-11",
    );
    const ctx = buildScanContext("test-fixtures/repos/gradle-junit", normalizeConfig({ evidence_providers: { qaradar: { enabled: "false" } } as any }));
    const facts = await runScan(ctx, "2026-06-11", () => {}, [told]);
    expect(facts.some((f) => f.id === "ownership.approvers.answer")).toBe(true);
    expect(facts.some((f) => f.id === "ownership.approvers")).toBe(false);
  });
});

describe("runScan qaradar test-shape wiring", () => {
  const maybe = qaradarInstalled() ? it : it.skip;
  maybe("includes a test.coverage-shape fact when qaradar runs (integration)", async () => {
    const ctx = buildScanContext("C:\\Users\\Murat\\Projects\\qaradar", normalizeConfig({ project_name: "qaradar" }));
    const facts = await runScan(ctx, "2026-06-08");
    expect(facts.some((f) => f.id === "test.coverage-shape")).toBe(true);
  });
});
