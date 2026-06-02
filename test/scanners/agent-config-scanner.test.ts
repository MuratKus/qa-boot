import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanAgentConfig } from "../../src/scanners/agent-config-scanner.js";

describe("agent-config-scanner", () => {
  it("detects CLAUDE.md and .claude dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "qaboot-agent-"));
    writeFileSync(join(dir, "CLAUDE.md"), "# rules");
    mkdirSync(join(dir, ".claude", "skills"), { recursive: true });
    writeFileSync(join(dir, ".claude", "skills", "keep.md"), "x");
    try {
      const ev = scanAgentConfig(buildScanContext(dir, defaultConfig("x")));
      expect(ev.some((e) => e.kind === "agent-config" && e.detail?.name === "CLAUDE.md")).toBe(true);
      expect(ev.some((e) => e.kind === "agent-config" && e.detail?.name === ".claude")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
