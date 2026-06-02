import { readFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import { minimatch } from "minimatch";

const IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**"];

export function listFiles(root: string): string[] {
  return fg.sync("**/*", {
    cwd: root,
    dot: true,
    ignore: IGNORE,
    onlyFiles: false,
    markDirectories: true,
  });
}

export function exists(files: string[], pattern: string): boolean {
  return files.some((f) => minimatch(f, pattern, { dot: true }));
}

export function matches(files: string[], pattern: string): string[] {
  return files.filter((f) => minimatch(f, pattern, { dot: true }));
}

export function readText(root: string, rel: string): string | null {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

export function readJson<T>(root: string, rel: string): T | null {
  const text = readText(root, rel);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
