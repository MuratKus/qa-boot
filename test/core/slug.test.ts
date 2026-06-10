import { describe, it, expect } from "vitest";
import { slug } from "../../src/core/slug.js";

describe("slug", () => {
  it("keeps existing agent-config behavior", () => {
    expect(slug(".claude")).toBe("claude");
    expect(slug("CLAUDE.md")).toBe("claude-md");
  });

  it("handles sentences with punctuation", () => {
    expect(slug("Staging resets nightly; don't trust data before 6am.")).toBe(
      "staging-resets-nightly-don-t-trust-data-before-6am",
    );
  });

  it("caps length at 60 and trims trailing dashes", () => {
    const s = slug("a".repeat(80) + " end");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });

  it("returns empty string for non-alphanumeric input", () => {
    expect(slug("!!! ???")).toBe("");
  });
});
