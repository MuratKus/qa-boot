# 09 — Demo Plan

## Demo goal

The demo should prove this idea:

```text
A QA can enter a messy multi-repo project, run QA Boot, and quickly get a practical map of what is known, what is missing, what is risky, and what Claude should or should not assume.
```

## Demo A: Real-ish project

Use a real KMP app + API pair.

Purpose:

- show it works on actual code,
- show multi-repo support,
- show Kotlin/mobile/API limitations honestly.

Flow:

1. Add both repos to workspace.
2. Run scan.
3. Generate context.
4. Show detected test/build/CI facts.
5. Show unknowns.
6. Show Claude using generated context.

Example commands:

```bash
qa-boot workspace init
qa-boot workspace add-repo ../kmp-app --type mobile
qa-boot workspace add-repo ../api --type backend
qa-boot workspace scan --with-qaradar
qa-boot workspace generate
```

## Demo B: Fake org

Create a controlled sample organization:

```text
sample-org-quality-lab/
  mobile-app/
  backend-api/
  admin-web/
  docs/
```

Include intentionally messy reality:

- partial CI,
- stale README,
- missing QA build docs,
- incomplete release notes,
- some tests,
- untested changed files,
- fake A/B testing doc,
- fake feature flag note,
- fake environment docs,
- fake product risk areas.

## Three-minute demo flow

### Step 1: Run scan

```bash
qa-boot workspace scan --with-qaradar
```

### Step 2: Show generated files

```text
qa-context/unknowns.md
qa-context/repo-risk.md
qa-context/maturity.md
CLAUDE.qa.md
.claude/skills/
```

### Step 3: Ask Claude what to test first

Prompt:

```text
What should I test first?
```

Expected behavior:

Claude uses `qa-context/repo-risk.md` and mentions limitations.

### Step 4: Ask Claude how to get a QA build

Prompt:

```text
How do I get a QA build?
```

Expected behavior:

Claude checks `qa-context/unknowns.md`, says the QA build process is unknown,
and surfaces the **exact human question to ask** — it does not guess.

### Step 5: Show the generated onboarding questions

Open `qa-context/unknowns.md` and show that each unknown maps to a concrete
question a new QA can take to the team:

```text
QA build generation process was not found.
→ Who or what system produces QA builds, where are artifacts stored, and who
  owns that workflow?
```

This is the V1 payoff: the gap is named, attributed, and turned into a question
— without inventing an answer.

### Step 6: Show maturity + refresh

```bash
qa-boot status
qa-boot refresh
```

Show `qa-context/maturity.md` (deterministic rubric scores + evidence +
unknowns) and the `refresh` diff summary of what changed since the last scan.

> Capturing the human's answer back into the context (told facts) and
> re-answering is a **V1.5** capability (Coach Mode, ADR 0005). V1 stops at
> naming the gap and the question.

## What the demo must show

- QA Boot detects real repo evidence.
- QA Radar adds technical repo risk.
- Unknowns are explicit and become human questions.
- Claude does not guess missing process knowledge.
- Maturity is scored deterministically with evidence.
- Technical risk is separated from business priority.
- The generated context is useful to a QA lead, not just an agent.

## Demo success line

```text
QA Boot turns messy repo and process evidence into a QA onboarding map that Claude can safely use.
```
