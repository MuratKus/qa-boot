import { describe, it, expect } from "vitest";
import { buildFacts } from "../../src/domains/build-facts.js";
import type { RawEvidence } from "../../src/scanners/raw-evidence.js";

describe("buildFacts", () => {
  it("creates a build-command fact", () => {
    const ev: RawEvidence[] = [
      { kind: "build-command", path: "package.json", detail: { name: "build", cmd: "tsc" } },
    ];
    const facts = buildFacts(ev, "2026-06-02");
    const f = facts.find((x) => x.id === "build.command.build")!;
    expect(f.provenance).toBe("observed");
    expect(f.value).toEqual({ command: "tsc" });
  });
});
