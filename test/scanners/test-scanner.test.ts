import { describe, it, expect } from "vitest";
import { buildScanContext } from "../../src/core/scan-context.js";
import { defaultConfig } from "../../src/config/config.js";
import { scanTests } from "../../src/scanners/test-scanner.js";

const ctx = (n: string) => buildScanContext(`test-fixtures/repos/${n}`, defaultConfig(n));

describe("test-scanner", () => {
  it("detects playwright config + framework on node fixture", () => {
    const ev = scanTests(ctx("node-playwright"));
    expect(ev.some((e) => e.kind === "test-framework" && e.detail?.name === "playwright")).toBe(true);
  });

  it("detects pytest config + tests dir on python fixture", () => {
    const ev = scanTests(ctx("python-pytest"));
    expect(ev.some((e) => e.kind === "test-framework" && e.detail?.name === "pytest")).toBe(true);
    expect(ev.some((e) => e.kind === "test-dir")).toBe(true);
  });

  it("finds no test frameworks in a bare repo", () => {
    expect(scanTests(ctx("bare")).filter((e) => e.kind === "test-framework")).toEqual([]);
  });
});

describe("test-scanner JVM detection", () => {
  it("detects junit + rest-assured + src/test from a Gradle Kotlin build file", () => {
    const ev = scanTests(ctx("gradle-junit"));
    const fw = ev.filter((e) => e.kind === "test-framework").map((e) => e.detail?.name);
    expect(fw).toContain("junit");
    expect(fw).toContain("rest-assured");
    expect(ev.some((e) => e.kind === "test-dir" && e.path === "src/test/")).toBe(true);
    expect(ev.find((e) => e.kind === "test-framework" && e.detail?.name === "junit")!.detail?.source).toBe("build-file");
  });

  it("detects junit + selenium from a Maven pom.xml", () => {
    const ev = scanTests(ctx("maven-selenium"));
    const fw = ev.filter((e) => e.kind === "test-framework").map((e) => e.detail?.name);
    expect(fw).toContain("junit");
    expect(fw).toContain("selenium");
  });
});
