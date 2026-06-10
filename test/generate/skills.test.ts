import { describe, it, expect } from "vitest";
import { renderSkills } from "../../src/generate/skills.js";

describe("renderSkills", () => {
  it("renders all five SKILL.md files with frontmatter", () => {
    const files = renderSkills({ hasRepoRisk: true });
    const paths = Object.keys(files).sort();
    expect(paths).toEqual([
      ".claude/skills/qa-context/SKILL.md",
      ".claude/skills/qa-onboard/SKILL.md",
      ".claude/skills/qa-release-readiness/SKILL.md",
      ".claude/skills/qa-risk/SKILL.md",
      ".claude/skills/qa-unknowns/SKILL.md",
    ]);
    expect(files[".claude/skills/qa-context/SKILL.md"]).toMatch(/^---\nname: qa-context/);
  });

  it("qa-risk skill notes when no QA Radar data is available", () => {
    const files = renderSkills({ hasRepoRisk: false });
    expect(files[".claude/skills/qa-risk/SKILL.md"]).toContain("not available");
  });

  it("renders the qa-onboard skill with tell instructions", () => {
    const out = renderSkills({ hasRepoRisk: false });
    const skill = out[".claude/skills/qa-onboard/SKILL.md"];
    expect(skill).toBeDefined();
    expect(skill).toContain("qa-boot tell");
    expect(skill).toContain("--by");
    expect(skill).toContain("never your own inference");
  });
});
