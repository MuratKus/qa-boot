import { describe, it, expect } from "vitest";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanRepo } from "../../src/scanners/repo-scanner.js";

const ctx = (name: string) =>
  buildScanContext(`test-fixtures/repos/${name}`, defaultConfig(name));

describe("repo-scanner", () => {
  it("detects node + typescript + npm + readme", () => {
    const ev = scanRepo(ctx("node-playwright"));
    const kinds = ev.map((e) => `${e.kind}:${e.detail?.name ?? ""}`);
    expect(kinds).toContain("language:javascript/typescript");
    expect(kinds).toContain("package-manager:npm");
    expect(ev.some((e) => e.kind === "readme")).toBe(true);
  });

  it("detects python on the pytest fixture", () => {
    const ev = scanRepo(ctx("python-pytest"));
    expect(ev.some((e) => e.kind === "language" && e.detail?.name === "python")).toBe(true);
  });

  it("emits nothing language-ish on a bare repo", () => {
    const ev = scanRepo(ctx("bare"));
    expect(ev.filter((e) => e.kind === "language")).toEqual([]);
  });
});
