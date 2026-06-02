import { describe, it, expect } from "vitest";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanCi } from "../../src/scanners/ci-scanner.js";

const ctx = (n: string) => buildScanContext(`test-fixtures/repos/${n}`, defaultConfig(n));

describe("ci-scanner", () => {
  it("detects github actions and a test job", () => {
    const ev = scanCi(ctx("node-playwright"));
    expect(ev.some((e) => e.kind === "ci-system" && e.detail?.name === "github-actions")).toBe(true);
    expect(ev.some((e) => e.kind === "ci-job" && e.detail?.kind === "test")).toBe(true);
  });

  it("detects no CI in a bare repo", () => {
    expect(scanCi(ctx("bare")).filter((e) => e.kind === "ci-system")).toEqual([]);
  });
});
