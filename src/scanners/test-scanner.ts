import type { ScanContext } from "../core/scan-context.js";
import type { RawEvidence } from "./raw-evidence.js";

const FRAMEWORK_CONFIGS: Array<[string, string]> = [
  ["playwright.config.*", "playwright"],
  ["cypress.config.*", "cypress"],
  ["jest.config.*", "jest"],
  ["vitest.config.*", "vitest"],
  ["pytest.ini", "pytest"],
  ["tox.ini", "pytest"],
];

const DEP_FRAMEWORKS: Array<[string, string]> = [
  ["@playwright/test", "playwright"],
  ["cypress", "cypress"],
  ["jest", "jest"],
  ["vitest", "vitest"],
  ["mocha", "mocha"],
];

const FRAMEWORK_KEYWORDS: Array<[string, string]> = [
  ["junit", "junit"],
  ["testng", "testng"],
  ["rest-assured", "rest-assured"],
  ["restassured", "rest-assured"],
  ["selenium", "selenium"],
  ["seleniumhq", "selenium"],
  ["selenide", "selenide"],
  ["cucumber", "cucumber"],
  ["appium", "appium"],
  ["espresso", "espresso"],
  ["xcuitest", "xcuitest"],
  ["k6", "k6"],
  ["jmeter", "jmeter"],
  ["gatling", "gatling"],
];

const BUILD_FILES = ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "pom.xml"];

const TEST_DIRS = ["test/", "tests/", "__tests__/", "spec/", "e2e/", "src/test/"];
const COVERAGE_MARKERS: Array<[string, string]> = [
  ["**/coverage/**", "coverage-dir"],
  ["**/.nyc_output/**", "nyc"],
  ["**/jacoco*.xml", "jacoco"],
];

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export function scanTests(ctx: ScanContext): RawEvidence[] {
  const ev: RawEvidence[] = [];
  const seen = new Set<string>();

  for (const [glob, name] of FRAMEWORK_CONFIGS) {
    if (ctx.has(glob) && !seen.has(name)) {
      seen.add(name);
      ev.push({ kind: "test-framework", path: glob, detail: { name, source: "config" } });
    }
  }

  const pkg = ctx.readJson<PkgJson>("package.json");
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [dep, name] of DEP_FRAMEWORKS) {
      if (deps[dep] && !seen.has(name)) {
        seen.add(name);
        ev.push({ kind: "test-framework", path: "package.json", detail: { name, source: "dependency" } });
      }
    }
  }
  const pyproject = ctx.read("pyproject.toml");
  if (pyproject && /\[tool\.pytest/.test(pyproject) && !seen.has("pytest")) {
    seen.add("pytest");
    ev.push({ kind: "test-framework", path: "pyproject.toml", detail: { name: "pytest", source: "config" } });
  }

  for (const buildFile of BUILD_FILES) {
    const text = ctx.read(buildFile);
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const [keyword, name] of FRAMEWORK_KEYWORDS) {
      if (lower.includes(keyword) && !seen.has(name)) {
        seen.add(name);
        ev.push({ kind: "test-framework", path: buildFile, detail: { name, source: "build-file" } });
      }
    }
  }

  for (const dir of TEST_DIRS) {
    if (ctx.has(`${dir}**`) || ctx.has(dir)) {
      ev.push({ kind: "test-dir", path: dir });
    }
  }

  for (const [glob, name] of COVERAGE_MARKERS) {
    if (ctx.has(glob)) ev.push({ kind: "coverage-tool", detail: { name } });
  }

  return ev;
}
