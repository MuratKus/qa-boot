import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGenerate } from "../../src/generate/generate.js";
import { makeFact } from "../../src/core/fact.js";
import { defaultConfig } from "../../src/config/config.js";

describe("runGenerate", () => {
  it("writes facts-derived files to disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "qaboot-gen-"));
    mkdirSync(join(dir, "qa-context"), { recursive: true });
    const facts = [
      makeFact({ id: "test.framework.jest", domain: "test", statement: "Jest detected.", provenance: "observed", confidence: 0.5, evidence_provider: "test-scanner", evidence: ["package.json"] }, "2026-06-02"),
      makeFact({ id: "environment.list", domain: "environment", statement: "Environments unknown.", provenance: "unknown", confidence: 0, evidence_provider: "unknowns-generator", value: { question: "What envs exist?" } }, "2026-06-02"),
    ];
    writeFileSync(join(dir, "qa-context", "facts.json"), JSON.stringify({ facts }));
    try {
      runGenerate({ repoPath: dir, config: defaultConfig("svc"), claude: true });
      expect(existsSync(join(dir, "qa-context", "unknowns.md"))).toBe(true);
      expect(existsSync(join(dir, "qa-context", "test-stack.md"))).toBe(true);
      expect(existsSync(join(dir, "qa-context", "maturity.md"))).toBe(true);
      expect(existsSync(join(dir, "CLAUDE.qa.md"))).toBe(true);
      expect(existsSync(join(dir, ".claude", "skills", "qa-unknowns", "SKILL.md"))).toBe(true);
      // No repo_quality fact -> repo-risk.md should NOT exist
      expect(existsSync(join(dir, "qa-context", "repo-risk.md"))).toBe(false);
      expect(readFileSync(join(dir, "qa-context", "unknowns.md"), "utf8")).toContain("Ask a human");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
