import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdInit } from "../../src/cli/commands/init.js";
import { cmdScan } from "../../src/cli/commands/scan.js";
import { cmdGenerate } from "../../src/cli/commands/generate.js";

function fixtureCopy(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), "qaboot-cli-"));
  cpSync(`test-fixtures/repos/${name}`, dir, { recursive: true });
  return dir;
}

describe("CLI commands", () => {
  it("init writes config + qa-context/README.md", async () => {
    const dir = fixtureCopy("bare");
    try {
      await cmdInit(dir, { projectName: "demo", claude: true, qaradar: "false" });
      expect(existsSync(join(dir, "qa-boot.config.json"))).toBe(true);
      expect(existsSync(join(dir, "qa-context", "README.md"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scan writes facts.json and auto-generates; generate re-renders", async () => {
    const dir = fixtureCopy("node-playwright");
    try {
      await cmdInit(dir, { projectName: "web", claude: true, qaradar: "false" });
      await cmdScan(dir, { generate: true, claude: true, withQaradar: false, skipQaradar: true });
      const factsPath = join(dir, "qa-context", "facts.json");
      expect(existsSync(factsPath)).toBe(true);
      expect(readFileSync(factsPath, "utf8")).toContain("test.framework.playwright");
      expect(existsSync(join(dir, "qa-context", "unknowns.md"))).toBe(true);
      expect(existsSync(join(dir, ".claude", "skills", "qa-context", "SKILL.md"))).toBe(true);

      await cmdGenerate(dir, { claude: true });
      expect(existsSync(join(dir, "qa-context", "test-stack.md"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scan --no-generate writes only facts.json", async () => {
    const dir = fixtureCopy("node-playwright");
    try {
      await cmdInit(dir, { projectName: "web", claude: true, qaradar: "false" });
      await cmdScan(dir, { generate: false, claude: true, withQaradar: false, skipQaradar: true });
      expect(existsSync(join(dir, "qa-context", "facts.json"))).toBe(true);
      expect(existsSync(join(dir, "qa-context", "unknowns.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
