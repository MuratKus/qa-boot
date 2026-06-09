import { describe, it, expect } from "vitest";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanBuild } from "../../src/scanners/build-scanner.js";

const ctx = (n: string) => buildScanContext(`test-fixtures/repos/${n}`, defaultConfig(n));

describe("build-scanner", () => {
  it("detects an npm build script on node fixture", () => {
    expect(scanBuild(ctx("node-playwright")).some((e) => e.kind === "build-command" && e.detail?.name === "build")).toBe(true);
  });

  it("detects no build signals on a bare repo", () => {
    expect(scanBuild(ctx("bare"))).toEqual([]);
  });
});

describe("build-scanner JVM build tools", () => {
  it("detects gradle on the gradle fixture", () => {
    const ev = scanBuild(ctx("gradle-junit"));
    expect(ev.some((e) => e.kind === "build-file" && e.detail?.name === "gradle")).toBe(true);
  });

  it("detects maven on the maven fixture", () => {
    const ev = scanBuild(ctx("maven-selenium"));
    expect(ev.some((e) => e.kind === "build-file" && e.detail?.name === "maven")).toBe(true);
  });
});
