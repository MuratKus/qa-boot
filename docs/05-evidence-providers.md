# 05 — Evidence Providers

## Definition

An evidence provider is a deterministic scanner, parser, CLI tool, or integration that produces structured quality-relevant evidence.

Evidence providers can be:

- built into QA Boot,
- external tools,
- future MCP-backed integrations.

## Principle

QA Boot should not ask an AI agent to rediscover facts that deterministic tools can calculate more reliably.

AI should help after the evidence exists.

## Examples of deterministic evidence

- Repository structure
- Test framework detection
- CI configuration
- Build scripts
- Coverage files
- Git churn
- Test-to-source mapping
- High-risk changed files
- Missing tests
- Documentation presence
- Known config files

## Built-in providers for V1

```text
repo-scanner
test-scanner
ci-scanner
docs-scanner
build-scanner
agent-config-scanner
```

## External provider for V1

```text
qaradar-adapter
```

## Future providers

```text
flake-detector
junit-parser
coverage-normalizer
test-report-parser
github-pr-adapter
jira-readonly-adapter
notion-readonly-adapter
confluence-readonly-adapter
testrail-readonly-adapter
datadog-readonly-adapter
sentry-readonly-adapter
```

## Provider output requirements

Every provider should output normalized facts or raw evidence that can be converted into facts.

A provider result should include:

- source/provider name,
- command or method used,
- evidence paths,
- confidence,
- limitations,
- timestamp,
- whether human confirmation is needed.

## Provider interface sketch

```ts
export interface EvidenceProvider {
  name: string;
  isAvailable(context: ScanContext): Promise<boolean>;
  collect(context: ScanContext): Promise<EvidenceResult[]>;
}

export interface EvidenceResult {
  provider: string;
  domain: string;
  statement: string;
  value?: unknown;
  evidence: string[];
  confidence: number;
  limitations?: string[];
  needsHumanConfirmation?: boolean;
}
```

## Normalization

Provider results should be normalized into the fact schema.

```text
provider output → normalized fact → facts.json → markdown reports → Claude context
```

## Rules

Evidence providers should not:

- write to external systems by default,
- access secrets,
- infer business priority unless explicitly provided,
- overwrite human-provided facts without review,
- hide limitations.

Evidence providers should:

- be repeatable,
- be local-first when possible,
- record their command/source,
- make uncertainty explicit,
- feed unknowns when context is missing.

## Knowledge-base future

V1 should not require knowledge-base integrations.

Instead, V1 should generate `qa-context/knowledge-sources.md`.

Future versions may support read-only MCP-based providers for:

- Notion,
- Confluence,
- Google Drive,
- Jira,
- Linear,
- GitHub,
- Sentry,
- Datadog,
- TestRail.

Default future posture should be read-only.
