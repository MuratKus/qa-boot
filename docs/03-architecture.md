# 03 — Architecture

## Recommended implementation language

Recommended: **TypeScript**.

Reasons:

- easy `npx` usage,
- natural CLI tooling,
- good JSON/Markdown/file-system ergonomics,
- common in repo tooling,
- fits Claude Code workflows well.

Example install/run flow:

```bash
npx qa-boot init
npx qa-boot scan
```

## High-level architecture

```text
CLI
  ↓
Config loader
  ↓
Workspace/repo resolver
  ↓
Built-in scanners
  ↓
External evidence providers
  ↓
Fact normalizer
  ↓
Unknowns generator
  ↓
Maturity evaluator
  ↓
Markdown/Claude generator
  ↓
Reports
```

## Suggested folder structure

```text
src/
  cli/
    index.ts
    commands/
      init.ts
      scan.ts
      generate.ts
      refresh.ts
      status.ts
      workspace.ts

  config/
    load-config.ts
    default-config.ts
    schema.ts

  scanners/
    repo-scanner.ts
    test-scanner.ts
    ci-scanner.ts
    docs-scanner.ts
    build-scanner.ts
    agent-config-scanner.ts

  evidence-providers/
    provider.ts
    qaradar-provider.ts
    built-in-provider.ts

  facts/
    fact-schema.ts
    fact-store.ts
    confidence.ts
    provenance.ts

  unknowns/
    unknowns-generator.ts
    questions-generator.ts

  maturity/
    maturity-model.ts
    maturity-evaluator.ts

  generators/
    markdown-generator.ts
    claude-generator.ts
    skill-generator.ts
    workspace-generator.ts

  templates/
    qa-context/
    claude/
    skills/
    reports/

  utils/
    fs.ts
    git.ts
    shell.ts
    logger.ts
```

## Data flow

```text
raw scan result
  → raw evidence
  → normalized fact
  → facts.json
  → unknowns
  → maturity summary
  → generated markdown
  → Claude skills/context
```

## Built-in scanners

### Repo scanner

Detects:

- languages,
- package managers,
- frameworks,
- monorepo structure,
- build files,
- dependency files,
- Docker files,
- Makefiles,
- README files,
- existing agent config files.

### Test scanner

Detects:

- test directories,
- test frameworks,
- test commands,
- unit/integration/e2e split,
- mobile tests,
- API tests,
- contract tests,
- snapshot tests,
- test reports,
- coverage tools.

Examples:

- Playwright
- Cypress
- Selenium
- Appium
- Espresso
- XCUITest
- JUnit
- pytest
- Jest
- Vitest
- Mocha
- k6
- JMeter
- RestAssured

### CI scanner

Detects:

- GitHub Actions,
- GitLab CI,
- Jenkins,
- CircleCI,
- Buildkite,
- Bitbucket Pipelines,
- Fastlane,
- Gradle tasks,
- test jobs,
- build jobs,
- deploy jobs,
- release jobs.

### Docs scanner

Detects:

- README,
- onboarding docs,
- QA docs,
- release docs,
- environment docs,
- test plans,
- regression checklists,
- ADRs,
- runbooks,
- bug templates,
- PR templates,
- CODEOWNERS.

### Build/release scanner

Detects or flags:

- how to build locally,
- how to generate QA builds,
- how artifacts are stored,
- how deployments happen,
- how releases are approved,
- what blocks release,
- what is manual,
- what is automated.

### Agent config scanner

Detects:

- `CLAUDE.md`,
- `AGENTS.md`,
- `.claude/`,
- Cursor rules,
- existing MCP configs,
- existing skills,
- existing hooks.

## Workspace support

Workspace config example:

```json
{
  "workspace_name": "sample-org-quality-lab",
  "repos": [
    {
      "name": "mobile-app",
      "path": "../mobile-app",
      "type": "mobile",
      "criticality": "unknown"
    },
    {
      "name": "backend-api",
      "path": "../api",
      "type": "backend",
      "criticality": "unknown"
    }
  ]
}
```

Workspace unknowns should include cross-system gaps:

- mobile/backend dependency unknown,
- API contract tests unknown,
- feature flag ownership unknown,
- A/B validation process unknown,
- release ordering unknown.
