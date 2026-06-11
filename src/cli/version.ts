import { createRequire } from "node:module";

export function cliVersion(): string {
  const pkg = createRequire(import.meta.url)("../../package.json") as { version: string };
  return pkg.version;
}
