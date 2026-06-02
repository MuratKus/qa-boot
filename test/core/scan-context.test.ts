import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";

describe("buildScanContext", () => {
  it("indexes files and exposes helpers", () => {
    const dir = mkdtempSync(join(tmpdir(), "qaboot-ctx-"));
    writeFileSync(join(dir, "README.md"), "# hi");
    try {
      const ctx = buildScanContext(dir, defaultConfig("demo"));
      expect(ctx.repoPath).toBe(dir);
      expect(ctx.has("README.md")).toBe(true);
      expect(ctx.has("cypress.config.*")).toBe(false);
      expect(ctx.read("README.md")).toContain("hi");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
