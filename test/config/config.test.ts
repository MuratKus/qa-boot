import { describe, it, expect } from "vitest";
import { defaultConfig, normalizeConfig } from "../../src/config/config.js";

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
