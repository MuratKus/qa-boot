import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { qaradarProvider } from "../../src/providers/qaradar-provider.js";
import { buildScanContext } from "../../src/core/scan-context.js";
import { normalizeConfig } from "../../src/config/config.js";

function qaradarInstalled(): boolean {
  try {
    execSync("qaradar --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("qaradarProvider", () => {
  it("isAvailable returns false when config disables it", async () => {
    const ctx = buildScanContext(".", normalizeConfig({ evidence_providers: { qaradar: { enabled: "false" } } as any }));
    expect(await qaradarProvider.isAvailable(ctx)).toBe(false);
  });

  const maybe = qaradarInstalled() ? it : it.skip;
  maybe("collect returns results on a real repo (integration; skipped if qaradar absent)", async () => {
    const ctx = buildScanContext("C:\\Users\\Murat\\Projects\\qaradar", normalizeConfig({ project_name: "qaradar" }));
    expect(await qaradarProvider.isAvailable(ctx)).toBe(true);
    const results = await qaradarProvider.collect(ctx);
    expect(results.some((r) => r.domain === "repo_quality")).toBe(true);
  });
});
