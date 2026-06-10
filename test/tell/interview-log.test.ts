import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatLogEntry, appendInterviewLog } from "../../src/tell/interview-log.js";

describe("formatLogEntry", () => {
  it("formats answer entries with Q and A", () => {
    const s = formatLogEntry({
      date: "2026-06-11", by: "murat",
      unknownId: "ownership.approvers", question: "Who approves?",
      domain: "ownership", statement: "QA guild approves.", factId: "ownership.approvers.answer", scope: "repo",
    });
    expect(s).toContain("## 2026-06-11 — murat");
    expect(s).toContain("**Q (ownership.approvers):** Who approves?");
    expect(s).toContain("**A:** QA guild approves.");
    expect(s).toContain("→ fact `ownership.approvers.answer` (scope: repo)");
  });

  it("formats free-form entries with Told", () => {
    const s = formatLogEntry({
      date: "2026-06-11", by: "murat", domain: "environment",
      statement: "Staging resets nightly.", factId: "environment.staging-reset", scope: "repo",
    });
    expect(s).toContain("**Told (environment):** Staging resets nightly.");
    expect(s).not.toContain("**Q (");
  });
});

describe("appendInterviewLog", () => {
  it("creates the file with a header on first write and appends after", () => {
    const repo = mkdtempSync(join(tmpdir(), "qa-boot-log-"));
    const entry = {
      date: "2026-06-11", by: "murat", domain: "environment",
      statement: "Staging resets nightly.", factId: "environment.staging-reset", scope: "repo",
    };
    const path = appendInterviewLog(repo, entry);
    appendInterviewLog(repo, { ...entry, statement: "Second entry.", factId: "environment.second" });
    const content = readFileSync(path, "utf8");
    expect(content.startsWith("# QA Interview Log")).toBe(true);
    expect(content).toContain("environment.staging-reset");
    expect(content).toContain("environment.second");
    expect(content.indexOf("# QA Interview Log")).toBe(content.lastIndexOf("# QA Interview Log"));
  });
});
