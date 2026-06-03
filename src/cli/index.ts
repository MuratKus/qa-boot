#!/usr/bin/env node
import { Command } from "commander";
import { cmdInit } from "./commands/init.js";
import { cmdScan } from "./commands/scan.js";
import { cmdGenerate } from "./commands/generate.js";
import { basename } from "node:path";

const program = new Command();
program.name("qa-boot").description("Bootstrap QA context for AI coding agents.").version("0.0.0");

program
  .command("init")
  .description("Initialize qa-boot config in the current repo")
  .option("--project-name <name>", "project name")
  .option("--no-claude", "disable Claude output")
  .option("--qaradar <mode>", "auto|true|false", "auto")
  .option("--force", "overwrite existing config")
  .action(async (o) => {
    await cmdInit(process.cwd(), {
      projectName: o.projectName ?? basename(process.cwd()),
      claude: o.claude,
      qaradar: o.qaradar,
      force: o.force,
    });
  });

program
  .command("scan")
  .description("Scan the repo, write facts.json, and generate context")
  .option("--no-generate", "write facts.json only")
  .option("--no-claude", "skip Claude output during generate")
  .option("--with-qaradar", "force-enable QA Radar")
  .option("--skip-qaradar", "disable QA Radar")
  .action(async (o) => {
    await cmdScan(process.cwd(), {
      generate: o.generate,
      claude: o.claude,
      withQaradar: Boolean(o.withQaradar),
      skipQaradar: Boolean(o.skipQaradar),
    });
  });

program
  .command("generate")
  .description("Generate context files from qa-context/facts.json")
  .option("--no-claude", "skip Claude output")
  .action(async (o) => {
    await cmdGenerate(process.cwd(), { claude: o.claude });
  });

program.parseAsync().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exitCode = 1;
});
