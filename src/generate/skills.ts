interface SkillDef {
  name: string;
  description: string;
  body: string;
}

function skillFile(def: SkillDef): string {
  return `---\nname: ${def.name}\ndescription: ${def.description}\n---\n\n${def.body}\n`;
}

export function renderSkills(opts: { hasRepoRisk: boolean }): Record<string, string> {
  const qaRiskBody = opts.hasRepoRisk
    ? [
        "Answer repo-risk questions using deterministic evidence from QA Radar.",
        "",
        "Rules:",
        "- Use `qa-context/repo-risk.md`.",
        "- Do not recalculate churn or coverage manually unless data is missing.",
        "- Do not confuse technical risk with business priority.",
        "- Mention limitations explicitly.",
      ].join("\n")
    : [
        "Answer repo-risk questions from deterministic evidence.",
        "",
        "QA Radar data is **not available** in this repo's context (`repo-risk.md` was not generated).",
        "Say so plainly and suggest running `qa-boot scan --with-qaradar`. Do not invent risk rankings.",
      ].join("\n");

  const defs: SkillDef[] = [
    {
      name: "qa-context",
      description: "Load and summarize the current QA context for this repo.",
      body: [
        "Load and summarize the QA context QA Boot generated.",
        "",
        "Rules:",
        "- Read `qa-context/`.",
        "- Separate observed, inferred, and unknown facts.",
        "- Mention any facts marked stale.",
      ].join("\n"),
    },
    {
      name: "qa-unknowns",
      description: "Prevent guessing — surface the exact question to ask a human.",
      body: [
        "Prevent the agent from guessing about QA/build/release/ownership.",
        "",
        "Rules:",
        "- Check `qa-context/unknowns.md`.",
        "- If required knowledge is unknown, say so clearly.",
        "- Surface the exact 'Ask a human' question rather than inventing an answer.",
      ].join("\n"),
    },
    {
      name: "qa-risk",
      description: "Answer 'what should I test first' from deterministic repo risk.",
      body: qaRiskBody,
    },
    {
      name: "qa-release-readiness",
      description: "Draft release-readiness guidance from known CI/release facts.",
      body: [
        "Draft release-readiness guidance based on known facts.",
        "",
        "Rules:",
        "- Use known CI/test/release facts from `qa-context/ci-and-release.md`.",
        "- Mention unknown release blockers from `qa-context/unknowns.md`.",
        "- Do not approve a release. Do not invent release gates.",
      ].join("\n"),
    },
    {
      name: "qa-onboard",
      description: "Interview a human to capture QA knowledge as told facts via qa-boot tell.",
      body: [
        "Interview the human to convert QA unknowns into recorded told facts.",
        "",
        "Phases:",
        "1. Precondition: if `qa-context/` or `qa-context/unknowns.md` is missing, say so and suggest `qa-boot scan`. Do not improvise context.",
        "2. Gather: if you lack baseline understanding of this repo, build it first — README, docs, repo structure, `qa-context/*.md`, `repo-risk.md` if present. Do not interview from ignorance.",
        "3. Play back: summarize your understanding to the human and let them correct it. Corrections are capturable answers.",
        "4. Interview: ask the open unknowns from `qa-context/unknowns.md` one question at a time, anchored in specifics you gathered. Then invite domain knowledge (environments, ownership, release, test data, business priority).",
        '5. Capture: after each human answer run `qa-boot tell <unknown-id> "<answer>" --by <name>` (or `qa-boot tell "<statement>" --domain <domain> --by <name>` for knowledge with no matching unknown). Record only what the human said or explicitly confirmed — never your own inference.',
        "6. Wrap: summarize what was captured, list remaining unknowns, and suggest `qa-boot scan` to refresh the generated context files.",
      ].join("\n"),
    },
  ];

  const out: Record<string, string> = {};
  for (const def of defs) out[`.claude/skills/${def.name}/SKILL.md`] = skillFile(def);
  return out;
}
