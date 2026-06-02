import { parse as parseYaml } from "yaml";
import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

const CI_SYSTEMS: Array<[string, string]> = [
  [".github/workflows/*.yml", "github-actions"],
  [".github/workflows/*.yaml", "github-actions"],
  [".gitlab-ci.yml", "gitlab-ci"],
  ["Jenkinsfile", "jenkins"],
  [".circleci/config.yml", "circleci"],
  [".buildkite/**", "buildkite"],
  ["bitbucket-pipelines.yml", "bitbucket-pipelines"],
];

const JOB_HINTS: Array<[RegExp, string]> = [
  [/test|spec|lint|check/i, "test"],
  [/build|compile|package/i, "build"],
  [/deploy|release|publish/i, "deploy"],
];

function classifyJobName(name: string): string | null {
  for (const [re, kind] of JOB_HINTS) if (re.test(name)) return kind;
  return null;
}

export function scanCi(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];
  const systems = new Set<string>();

  for (const [glob, name] of CI_SYSTEMS) {
    const hits = ctx.match(glob);
    if (hits.length && !systems.has(name)) {
      systems.add(name);
      ev.push({ kind: "ci-system", path: hits[0], detail: { name } });
    }
  }

  for (const wf of ctx.match(".github/workflows/*.{yml,yaml}")) {
    const text = ctx.read(wf);
    if (!text) continue;
    let doc: unknown;
    try {
      doc = parseYaml(text);
    } catch {
      continue;
    }
    const jobs = (doc as { jobs?: Record<string, unknown> })?.jobs;
    for (const jobName of Object.keys(jobs ?? {})) {
      const kind = classifyJobName(jobName);
      if (kind) ev.push({ kind: "ci-job", path: wf, detail: { name: jobName, kind } });
    }
  }

  return ev;
}
