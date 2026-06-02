import { readJson } from "../core/fs-utils.js";

export interface QaBootConfig {
  project_name: string;
  mode: "single-repo";
  claude: { enabled: boolean; generate_skills: boolean };
  evidence_providers: {
    qaradar: { enabled: "auto" | "true" | "false" | boolean; days: number; top: number };
  };
  refresh: { default_days: number };
}

export function defaultConfig(projectName: string): QaBootConfig {
  return {
    project_name: projectName,
    mode: "single-repo",
    claude: { enabled: true, generate_skills: true },
    evidence_providers: { qaradar: { enabled: "auto", days: 90, top: 20 } },
    refresh: { default_days: 30 },
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function normalizeConfig(partial: DeepPartial<QaBootConfig>): QaBootConfig {
  const base = defaultConfig(partial.project_name ?? "project");
  return {
    project_name: partial.project_name ?? base.project_name,
    mode: "single-repo",
    claude: { ...base.claude, ...partial.claude },
    evidence_providers: {
      qaradar: { ...base.evidence_providers.qaradar, ...partial.evidence_providers?.qaradar },
    },
    refresh: { ...base.refresh, ...partial.refresh },
  };
}

export function loadConfig(repoPath: string): QaBootConfig {
  const raw = readJson<DeepPartial<QaBootConfig>>(repoPath, "qa-boot.config.json");
  return normalizeConfig(raw ?? { project_name: "project" });
}

export function qaradarEnabled(c: QaBootConfig): "auto" | "true" | "false" {
  const v = c.evidence_providers.qaradar.enabled;
  if (v === true) return "true";
  if (v === false) return "false";
  return v;
}
