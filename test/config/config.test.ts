import { describe, it, expect } from "vitest";
import { defaultConfig, normalizeConfig, qaradarEnabled, loadConfig } from "../../src/config/config.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("config", () => {
  it("defaultConfig fills sane values", () => {
    const c = defaultConfig("svc");
    expect(c.project_name).toBe("svc");
    expect(c.mode).toBe("single-repo");
    expect(c.claude.enabled).toBe(true);
    expect(c.evidence_providers.qaradar.enabled).toBe("auto");
    expect(c.evidence_providers.qaradar.days).toBe(90);
    expect(c.refresh.default_days).toBe(30);
  });

  it("normalizeConfig merges partial over defaults", () => {
    const c = normalizeConfig({ project_name: "p", claude: { enabled: false } });
    expect(c.project_name).toBe("p");
    expect(c.claude.enabled).toBe(false);
    expect(c.claude.generate_skills).toBe(true); // default preserved
    expect(c.evidence_providers.qaradar.top).toBe(20);
  });
});

describe("qaradarEnabled", () => {
  it("maps the tri-state and booleans to strings", () => {
    const c = defaultConfig("x");
    c.evidence_providers.qaradar.enabled = "auto";
    expect(qaradarEnabled(c)).toBe("auto");
    c.evidence_providers.qaradar.enabled = "true";
    expect(qaradarEnabled(c)).toBe("true");
    c.evidence_providers.qaradar.enabled = "false";
    expect(qaradarEnabled(c)).toBe("false");
    c.evidence_providers.qaradar.enabled = true;
    expect(qaradarEnabled(c)).toBe("true");
    c.evidence_providers.qaradar.enabled = false;
    expect(qaradarEnabled(c)).toBe("false");
  });
});

describe("loadConfig", () => {
  it("returns normalized defaults when no config file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "qaboot-cfg-"));
    try {
      const c = loadConfig(dir);
      expect(c.mode).toBe("single-repo");
      expect(c.evidence_providers.qaradar.days).toBe(90);
      expect(c.claude.generate_skills).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
