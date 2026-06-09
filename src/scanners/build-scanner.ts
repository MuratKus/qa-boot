import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

interface PkgJson {
  scripts?: Record<string, string>;
}

const SCRIPT_KINDS = ["build", "start", "test", "package"];

export function scanBuild(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];

  const pkg = ctx.readJson<PkgJson>("package.json");
  for (const name of SCRIPT_KINDS) {
    const cmd = pkg?.scripts?.[name];
    if (cmd) ev.push({ kind: "build-command", path: "package.json", detail: { name, cmd } });
  }

  if (ctx.has("Makefile")) ev.push({ kind: "build-file", path: "Makefile", detail: { name: "make" } });
  if (ctx.has("Dockerfile")) ev.push({ kind: "build-file", path: "Dockerfile", detail: { name: "docker" } });
  for (const f of ctx.match("docker-compose*.{yml,yaml}")) {
    ev.push({ kind: "build-file", path: f, detail: { name: "docker-compose" } });
  }
  if (ctx.has("fastlane/**") || ctx.has("Fastfile")) {
    ev.push({ kind: "build-file", path: "fastlane", detail: { name: "fastlane" } });
  }

  if (ctx.has("build.gradle") || ctx.has("build.gradle.kts") || ctx.has("gradlew") || ctx.has("settings.gradle") || ctx.has("settings.gradle.kts")) {
    ev.push({ kind: "build-file", path: "build.gradle", detail: { name: "gradle" } });
  }
  if (ctx.has("pom.xml") || ctx.has("mvnw")) {
    ev.push({ kind: "build-file", path: "pom.xml", detail: { name: "maven" } });
  }

  return ev;
}
