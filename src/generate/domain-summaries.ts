import type { Fact } from "../core/fact.js";
import { renderKnownUnknown } from "./known-unknown.js";

interface SummarySpec {
  file: string;
  title: string;
  purpose: string;
  domains: string[];
}

const SPECS: SummarySpec[] = [
  { file: "qa-context/test-stack.md", title: "Test Stack", purpose: "What testing tooling this repo uses.", domains: ["test", "test_trust"] },
  { file: "qa-context/build-and-run.md", title: "Build and Run", purpose: "How to build and run this project.", domains: ["build"] },
  { file: "qa-context/ci-and-release.md", title: "CI and Release", purpose: "Continuous integration and release signals.", domains: ["ci", "release"] },
  { file: "qa-context/environments.md", title: "Environments", purpose: "Test environments and their stability.", domains: ["environment"] },
  { file: "qa-context/test-data.md", title: "Test Data", purpose: "How test data is created and reset.", domains: ["test_data"] },
  { file: "qa-context/knowledge-sources.md", title: "Knowledge Sources", purpose: "Where project knowledge lives.", domains: ["knowledge_sources"] },
  { file: "qa-context/product-risk-map.md", title: "Product Risk Map", purpose: "Business priority of repo areas (usually unknown in V0).", domains: ["business_priority"] },
];

export function renderDomainSummaries(facts: Fact[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of SPECS) {
    const subset = facts.filter((f) => spec.domains.includes(f.domain));
    out[spec.file] = renderKnownUnknown(spec.title, spec.purpose, subset);
  }
  return out;
}
