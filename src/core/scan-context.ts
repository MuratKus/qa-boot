import { listFiles, exists, matches, readText, readJson } from "./fs-utils.js";
import type { QaBootConfig } from "../config/config.js";

export interface ScanContext {
  repoPath: string;
  config: QaBootConfig;
  files: string[];
  has(pattern: string): boolean;
  match(pattern: string): string[];
  read(rel: string): string | null;
  readJson<T>(rel: string): T | null;
}

export function buildScanContext(repoPath: string, config: QaBootConfig): ScanContext {
  const files = listFiles(repoPath);
  return {
    repoPath,
    config,
    files,
    has: (p) => exists(files, p),
    match: (p) => matches(files, p),
    read: (rel) => readText(repoPath, rel),
    readJson: <T>(rel: string) => readJson<T>(repoPath, rel),
  };
}
