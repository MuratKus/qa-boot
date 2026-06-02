import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listFiles, exists, readText, readJson } from "../../src/core/fs-utils.js";

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "qaboot-fs-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), '{"name":"x"}');
  writeFileSync(join(dir, "src", "a.ts"), "export const a = 1;");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("fs-utils", () => {
  it("lists files relative to root, excluding node_modules/.git", () => {
    const files = listFiles(dir);
    expect(files).toContain("package.json");
    expect(files).toContain("src/a.ts");
  });

  it("exists matches a glob against the index", () => {
    const files = listFiles(dir);
    expect(exists(files, "package.json")).toBe(true);
    expect(exists(files, "**/*.ts")).toBe(true);
    expect(exists(files, "cypress.config.*")).toBe(false);
  });

  it("readText returns content or null", () => {
    expect(readText(dir, "package.json")).toContain("name");
    expect(readText(dir, "missing.txt")).toBeNull();
  });

  it("readJson parses or returns null", () => {
    expect(readJson<{ name: string }>(dir, "package.json")?.name).toBe("x");
    expect(readJson(dir, "src/a.ts")).toBeNull();
  });
});
