import { describe, it, expect } from "vitest";
import { FactStore } from "../../src/core/fact-store.js";
import { makeFact } from "../../src/core/fact.js";

const f = (id: string, day: string, conf = 0.8) =>
  makeFact(
    { id, domain: "test", statement: id, provenance: "observed", confidence: conf, evidence_provider: "x" },
    day,
  );

describe("FactStore.upsert", () => {
  it("inserts new facts", () => {
    const s = new FactStore([]);
    s.upsert([f("a", "2026-06-02")]);
    expect(s.all().map((x) => x.id)).toEqual(["a"]);
  });

  it("replaces existing fact by id and refreshes last_verified", () => {
    const s = new FactStore([f("a", "2026-05-01", 0.5)]);
    s.upsert([f("a", "2026-06-02", 0.8)]);
    const a = s.byId("a")!;
    expect(a.confidence).toBe(0.8);
    expect(a.last_verified).toBe("2026-06-02");
  });

  it("clears a stale flag when re-emitted", () => {
    const old = { ...f("a", "2026-05-01"), stale: true, stale_reason: "expired" };
    const s = new FactStore([old]);
    s.upsert([f("a", "2026-06-02")]);
    expect(s.byId("a")!.stale).toBeUndefined();
  });
});

describe("FactStore.markTimeStaleness", () => {
  it("marks facts past expiry as stale", () => {
    const s = new FactStore([f("a", "2026-01-01")]); // >30 days before today
    s.markTimeStaleness("2026-06-02");
    const a = s.byId("a")!;
    expect(a.stale).toBe(true);
    expect(a.stale_reason).toBe("expired");
  });

  it("leaves fresh facts untouched", () => {
    const s = new FactStore([f("a", "2026-06-01")]);
    s.markTimeStaleness("2026-06-02");
    expect(s.byId("a")!.stale).toBeUndefined();
  });
});

describe("FactStore.remove", () => {
  it("remove deletes a fact by id and reports whether it existed", () => {
    const store = new FactStore([
      makeFact({ id: "a.one", domain: "a", statement: "s", provenance: "observed", confidence: 1, evidence_provider: "t" }, "2026-06-11"),
    ]);
    expect(store.remove("a.one")).toBe(true);
    expect(store.byId("a.one")).toBeUndefined();
    expect(store.remove("a.one")).toBe(false);
  });
});
