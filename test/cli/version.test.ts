import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { cliVersion } from "../../src/cli/version.js";

describe("cliVersion", () => {
  it("matches the version in package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    expect(cliVersion()).toBe(pkg.version);
  });
});
