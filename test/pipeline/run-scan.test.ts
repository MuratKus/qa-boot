import { describe, it, expect } from "vitest";
import { runScan } from "../../src/pipeline/run-scan.js";
import { buildScanContext } from "../../src/core/scan-context.js";
import { normalizeConfig } from "../../src/config/config.js";

describe("runScan", () => {
  it("produces facts from the node fixture without QA Radar", async () => {
    const ctx = buildScanContext("test-fixtures/repos/node-playwright", normalizeConfig({ evidence_providers: { qaradar: { enabled: "false" } } as any }));
    const facts = await runScan(ctx, "2026-06-02");
    expect(facts.some((f) => f.id === "test.framework.playwright")).toBe(true);
    expect(facts.some((f) => f.provenance === "unknown")).toBe(true);
    expect(facts.some((f) => f.domain === "maturity")).toBe(true);
  });
});
