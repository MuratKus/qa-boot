# ADR 0004: Shared vs local context

## Status

Accepted

## Context

QA Boot should create reusable project quality memory, but some context may be sensitive or personal.

Examples:

- shared build/test/release docs should be committed,
- private stakeholder notes should not be committed,
- credentials and MCP configs should never be committed.

## Decision

QA Boot will separate shared committed context from local/private context.

Committed:

```text
qa-context/
.claude/skills/
CLAUDE.qa.md
qa-boot.config.json
qa-workspace/
```

Local/private:

```text
qa-context.local/
.mcp.local.json
.env
```

## Reason

The project should help teams retain QA knowledge without leaking sensitive context.

## Consequences

- Generated docs should avoid naming individuals in sensitive ways.
- Political or stakeholder-specific notes should stay local.
- The default generated files should be safe for open-source demos.
