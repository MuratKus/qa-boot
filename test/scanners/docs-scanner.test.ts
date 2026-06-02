import { describe, it, expect } from "vitest";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanDocs } from "../../src/scanners/docs-scanner.js";

const ctx = (n: string) => buildScanContext(`test-fixtures/repos/${n}`, defaultConfig(n));

describe("docs-scanner", () => {
  it("detects README as a doc on node fixture", () => {
    expect(scanDocs(ctx("node-playwright")).some((e) => e.kind === "doc" && e.detail?.kind === "readme")).toBe(true);
  });

  it("detects nothing on bare repo", () => {
    expect(scanDocs(ctx("bare"))).toEqual([]);
  });
});
