import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

interface PkgJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function scanRepo(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];

  const langMarkers: Array<[string, string, string]> = [
    ["package.json", "language:javascript/typescript", "npm"],
    ["pyproject.toml", "python", "pip"],
    ["go.mod", "go", "go"],
    ["pom.xml", "java", "maven"],
    ["build.gradle", "java/kotlin", "gradle"],
    ["build.gradle.kts", "java/kotlin", "gradle"],
    ["Cargo.toml", "rust", "cargo"],
    ["Gemfile", "ruby", "bundler"],
  ];
  for (const [file, lang, pm] of langMarkers) {
    if (ctx.has(file)) {
      const name = lang.startsWith("language:") ? lang.slice("language:".length) : lang;
      ev.push({ kind: "language", path: file, detail: { name } });
      ev.push({ kind: "package-manager", path: file, detail: { name: pm } });
    }
  }

  const pkg = ctx.readJson<PkgJson>("package.json");
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name] of Object.entries(deps)) {
      ev.push({ kind: "dependency", path: "package.json", detail: { name } });
    }
    for (const [script, cmd] of Object.entries(pkg.scripts ?? {})) {
      ev.push({ kind: "npm-script", path: "package.json", detail: { name: script, cmd } });
    }
  }

  if (ctx.has("Dockerfile")) ev.push({ kind: "dockerfile", path: "Dockerfile" });
  if (ctx.has("Makefile")) ev.push({ kind: "makefile", path: "Makefile" });
  for (const marker of ["pnpm-workspace.yaml", "lerna.json", "nx.json"]) {
    if (ctx.has(marker)) ev.push({ kind: "monorepo", path: marker, detail: { name: marker } });
  }
  for (const r of ctx.match("README*")) ev.push({ kind: "readme", path: r });

  return ev;
}
