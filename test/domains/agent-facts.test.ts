import { describe, it, expect } from "vitest";
import { agentFacts } from "../../src/domains/agent-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

describe("agentFacts", () => {
  it("creates agent_permissions facts for config presence", () => {
    const ev: RawEvidence[] = [
      { kind: "agent-config", path: "CLAUDE.md", detail: { name: "CLAUDE.md" } },
      { kind: "agent-skills", path: ".claude/skills" },
    ];
    const facts = agentFacts(ev, "2026-06-02");
    expect(facts.some((f) => f.id === "agent_permissions.config.CLAUDE.md")).toBe(true);
    expect(facts.some((f) => f.id === "agent_permissions.skills")).toBe(true);
  });
});
