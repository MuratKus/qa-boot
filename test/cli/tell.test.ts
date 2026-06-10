import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdScan } from "../../src/cli/commands/scan.js";
import { cmdTell } from "../../src/cli/commands/tell.js";
import type { Fact } from "../../src/core/fact.js";

function factsOf(repo: string): Fact[] {
  return (JSON.parse(readFileSync(join(repo, "qa-context", "facts.json"), "utf8")) as { facts: Fact[] }).facts;
}

describe("qa-boot tell end-to-end", () => {
  it("scan -> tell -> facts/log updated -> rescan keeps unknown closed", async () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-tell-"));
    try {
      writeFileSync(join(repo, "README.md"), "# fixture\n", "utf8");

      await cmdScan(repo, { generate: false, claude: false, withQaradar: false, skipQaradar: true });
      expect(factsOf(repo).some((f) => f.id === "ownership.approvers")).toBe(true);

      await cmdTell(repo, "ownership.approvers", "QA guild approves risky changes.", { by: "murat" });

      const facts = factsOf(repo);
      const told = facts.find((f) => f.id === "ownership.approvers.answer")!;
      expect(told.provenance).toBe("told");
      expect(told.told_by).toBe("murat");
      expect(facts.some((f) => f.id === "ownership.approvers")).toBe(false);
      const log = readFileSync(join(repo, "qa-context", "qa-interview-log.md"), "utf8");
      expect(log).toContain("ownership.approvers.answer");

      await cmdScan(repo, { generate: false, claude: false, withQaradar: false, skipQaradar: true });
      const after = factsOf(repo);
      expect(after.some((f) => f.id === "ownership.approvers")).toBe(false);
      expect(after.some((f) => f.id === "ownership.approvers.answer")).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("free-form tell works without a prior scan store", async () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-tell-ff-"));
    try {
      await cmdTell(repo, undefined, "Staging resets nightly.", { by: "murat", domain: "environment" });
      expect(factsOf(repo).some((f) => f.id === "environment.staging-resets-nightly")).toBe(true);
      expect(existsSync(join(repo, "qa-context", "qa-interview-log.md"))).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
