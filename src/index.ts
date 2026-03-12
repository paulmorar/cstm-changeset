#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createInterface, Interface } from "node:readline";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessContext {
  businessValue: string;
  hasClientImpact: boolean;
  clientImpactDetail: string;
  isTested: boolean;
  testingDetail: string;
}

// ─── Filesystem ───────────────────────────────────────────────────────────────

export function getChangesetDir(): string {
  return resolve(process.cwd(), ".changeset");
}

export function getChangesetFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  } catch {
    console.error(
      `\n❌  Could not find a .changeset directory at:\n   ${dir}\n\n` +
        `   Make sure you're running this from the root of a project that uses changesets.\n`,
    );
    process.exit(1);
  }
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function ask(rl: Interface, question: string): Promise<string> {
  return new Promise((res) => rl.question(question, res));
}

export async function askYesNo(rl: Interface, question: string): Promise<boolean> {
  while (true) {
    const answer = (await ask(rl, `${question} (y/n): `)).trim().toLowerCase();
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    console.log('  Please answer "y" or "n".');
  }
}

export async function askFreeText(rl: Interface, question: string): Promise<string> {
  const answer = (await ask(rl, `${question}\n> `)).trim();
  return answer || "No details provided.";
}

// ─── Annotation ───────────────────────────────────────────────────────────────

export function buildAnnotation(ctx: BusinessContext): string {
  return `
## Business Context

**Business value:** ${ctx.businessValue}

**Client impact:** ${ctx.hasClientImpact ? `Yes — ${ctx.clientImpactDetail}` : "No"}

**Tested:** ${ctx.isTested ? `Yes — ${ctx.testingDetail}` : "No"}
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const changesetDir = getChangesetDir();
  const before = new Set(getChangesetFiles(changesetDir));

  console.log("\n📝  Running changeset add...\n");
  const result = spawnSync("npx", ["changeset", "add"], { stdio: "inherit" });

  if (result.status !== 0) {
    console.error("\n❌  changeset add failed. Exiting.");
    process.exit(result.status ?? 1);
  }

  const after = getChangesetFiles(changesetDir);
  const newFiles = after.filter((f) => !before.has(f));

  if (newFiles.length === 0) {
    console.log("\nNo new changeset file detected — nothing to annotate.");
    process.exit(0);
  }

  const newFile = resolve(changesetDir, newFiles[0]);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n─────────────────────────────────────────────");
  console.log("  📋  A few more questions for the changelog");
  console.log("─────────────────────────────────────────────\n");

  const businessValue = await askFreeText(
    rl,
    "1. What value does this change bring to the business?",
  );

  console.log();
  const hasClientImpact = await askYesNo(rl, "2. Does this carry client impact?");
  let clientImpactDetail = "";
  if (hasClientImpact) {
    clientImpactDetail = await askFreeText(rl, "   Please describe the client impact:");
  }

  console.log();
  const isTested = await askYesNo(rl, "3. Has this been tested?");
  let testingDetail = "";
  if (isTested) {
    testingDetail = await askFreeText(rl, "   Briefly describe how it was tested:");
  }

  rl.close();

  const existingContent = readFileSync(newFile, "utf8");
  const annotation = buildAnnotation({
    businessValue,
    hasClientImpact,
    clientImpactDetail,
    isTested,
    testingDetail,
  });

  writeFileSync(newFile, existingContent.trimEnd() + "\n" + annotation);

  console.log(`\n✅  Changeset annotated: ${newFiles[0]}\n`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
