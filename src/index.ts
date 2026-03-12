#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createInterface, Interface } from "node:readline";
import { readdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ─── Constants ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8")) as {
  version: string;
};
const VERSION = pkg.version;
const HELP_TEXT = `
cstm-changeset v${VERSION}

A wrapper around changesets CLI that adds business context prompts to 'add'.

Usage:
  npx cstm-changeset [command] [options]

Commands:
  add            Create a changeset with business context prompts (default)
  status         Show changeset status
  version        Apply changesets and update versions  
  publish        Publish packages to npm
  init           Initialize changesets in your project
  pre <mode>     Enter/exit prerelease mode
  tag            Create git tags for published packages

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

All other arguments are passed through to the underlying changeset command.

Examples:
  npx cstm-changeset              Run 'add' with business context prompts
  npx cstm-changeset add          Same as above
  npx cstm-changeset status       Check changeset status
  npx cstm-changeset version      Apply changesets
  npx cstm-changeset --help       Show this help
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessContext {
  businessValue: string;
  hasClientImpact: boolean;
  clientImpactDetail: string;
  isTested: boolean;
  testingDetail: string;
}

class ChangesetError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = "ChangesetError";
  }
}

// ─── Filesystem ───────────────────────────────────────────────────────────────

export function getChangesetDir(): string {
  return resolve(process.cwd(), ".changeset");
}

export function getChangesetFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    throw new ChangesetError(
      `Could not find a .changeset directory at:\n   ${dir}\n\n` +
        `   Make sure you're running this from the root of a project that uses changesets.`,
    );
  }

  try {
    return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ChangesetError(`Failed to read .changeset directory: ${message}`);
  }
}

function readChangesetFile(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ChangesetError(`Failed to read changeset file: ${message}`);
  }
}

function writeChangesetFile(filePath: string, content: string): void {
  try {
    writeFileSync(filePath, content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ChangesetError(`Failed to write changeset file: ${message}`);
  }
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function ask(rl: Interface, question: string): Promise<string> {
  return new Promise((res, rej) => {
    rl.question(question, (answer) => {
      res(answer);
    });
    rl.once("close", () => {
      rej(new ChangesetError("Prompt cancelled", 130));
    });
  });
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

// ─── CLI ──────────────────────────────────────────────────────────────────────

interface ParsedArgs {
  help: boolean;
  version: boolean;
  command: string | null;
  rest: string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const help = args.includes("-h") || args.includes("--help");
  const version = args.includes("-v") || args.includes("--version");

  // Filter out flags for command detection
  const nonFlags = args.filter((a) => !a.startsWith("-"));
  const command = nonFlags[0] || null;
  const rest = args.slice(command ? args.indexOf(command) + 1 : 0);

  return { help, version, command, rest };
}

function runChangesetCommand(command: string, args: string[] = []): number {
  const result = spawnSync("npx", ["changeset", command, ...args], {
    stdio: "inherit",
  });

  if (result.error) {
    throw new ChangesetError(`Failed to run changeset ${command}: ${result.error.message}`);
  }

  return result.status ?? 1;
}

function runChangesetAdd(): number {
  return runChangesetCommand("add");
}

async function collectBusinessContext(rl: Interface): Promise<BusinessContext> {
  console.log("\n─────────────────────────────────────────────");
  console.log("  📋  A few more questions for the changelog");
  console.log("─────────────────────────────────────────────\n");

  const businessValue = await askFreeText(
    rl,
    "1. What value does this change bring to the business?",
  );

  console.log();
  const hasClientImpact = await askYesNo(rl, "2. Does this carry client impact?");
  const clientImpactDetail = hasClientImpact
    ? await askFreeText(rl, "   Please describe the client impact:")
    : "";

  console.log();
  const isTested = await askYesNo(rl, "3. Has this been tested?");
  const testingDetail = isTested
    ? await askFreeText(rl, "   Briefly describe how it was tested:")
    : "";

  return {
    businessValue,
    hasClientImpact,
    clientImpactDetail,
    isTested,
    testingDetail,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runAddWithContext(): Promise<void> {
  const changesetDir = getChangesetDir();
  const before = new Set(getChangesetFiles(changesetDir));

  console.log("\n📝  Running changeset add...\n");
  const exitCode = runChangesetAdd();

  if (exitCode !== 0) {
    throw new ChangesetError("changeset add failed", exitCode);
  }

  const after = getChangesetFiles(changesetDir);
  const newFiles = after.filter((f) => !before.has(f));

  if (newFiles.length === 0) {
    console.log("\nNo new changeset file detected — nothing to annotate.");
    return;
  }

  const newFile = resolve(changesetDir, newFiles[0]);

  // Check stdin is interactive
  if (!process.stdin.isTTY) {
    console.log("\n⚠️  Non-interactive mode detected — skipping business context prompts.");
    return;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const context = await collectBusinessContext(rl);
    const existingContent = readChangesetFile(newFile);
    const annotation = buildAnnotation(context);

    writeChangesetFile(newFile, existingContent.trimEnd() + "\n" + annotation);

    console.log(`\n✅  Changeset annotated: ${newFiles[0]}\n`);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const { help, version, command, rest } = parseArgs(process.argv.slice(2));

  if (version) {
    console.log(VERSION);
    return;
  }

  if (help) {
    console.log(HELP_TEXT);
    return;
  }

  // No command or 'add' command: run with business context
  if (!command || command === "add") {
    await runAddWithContext();
    return;
  }

  // Pass through to changeset CLI for other commands
  const exitCode = runChangesetCommand(command, rest);
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const entryPath = realpathSync(resolve(process.argv[1]));
const isMain = import.meta.url === pathToFileURL(entryPath).href;

if (isMain) {
  main().catch((err: unknown) => {
    if (err instanceof ChangesetError) {
      console.error(`\n❌  ${err.message}\n`);
      process.exit(err.exitCode);
    }
    console.error("\n❌  Unexpected error:", err);
    process.exit(1);
  });
}
