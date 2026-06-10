import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Fact } from "./fact.js";
import { todayISO } from "./fact.js";

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.floor(ms / 86_400_000);
}

export class FactStore {
  private facts = new Map<string, Fact>();

  constructor(initial: Fact[] = []) {
    for (const f of initial) this.facts.set(f.id, f);
  }

  static load(path: string): FactStore {
    if (!existsSync(path)) return new FactStore([]);
    const raw = JSON.parse(readFileSync(path, "utf8")) as { facts: Fact[] };
    return new FactStore(raw.facts ?? []);
  }

  save(path: string): void {
    mkdirSync(dirname(path), { recursive: true });
    const out = { facts: this.all() };
    writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");
  }

  upsert(incoming: Fact[]): void {
    for (const f of incoming) {
      const next = { ...f };
      delete next.stale;
      delete next.stale_reason;
      this.facts.set(f.id, next);
    }
  }

  markTimeStaleness(today: string = todayISO()): void {
    for (const f of this.facts.values()) {
      if (daysBetween(f.last_verified, today) > f.expires_after_days) {
        f.stale = true;
        f.stale_reason = "expired";
      }
    }
  }

  remove(id: string): boolean {
    return this.facts.delete(id);
  }

  byId(id: string): Fact | undefined {
    return this.facts.get(id);
  }

  all(): Fact[] {
    return [...this.facts.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}
