#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { runEek } from "./eek/orchestrator.mjs";

main().catch((error) => {
  console.error(`EEK failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.error && !options.file)) {
    printHelp();
    process.exitCode = options.help ? 0 : 1;
    return;
  }

  const bugReport = [options.error, options.file ? await readFile(path.resolve(options.file), "utf8") : ""]
    .filter(Boolean)
    .join("\n\n");
  const result = await runEek({
    projectPath: options.project,
    bugReport,
    reproCommand: options.command,
    validationCommand: options.validate || options.command,
    timeoutMs: options.timeoutMs,
    maxRetries: options.maxRetries,
    dryRun: options.dryRun,
    apply: options.apply
  });
  console.log(result.report);
  if (result.status === "escalated") process.exitCode = 2;
}

function parseArgs(args) {
  const options = {
    apply: false,
    command: "npm test",
    dryRun: false,
    error: "",
    file: "",
    help: false,
    maxRetries: 3,
    project: process.cwd(),
    timeoutMs: 60_000,
    validate: ""
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--error") options.error = required(args, ++index, arg);
    else if (arg === "--file") options.file = required(args, ++index, arg);
    else if (arg === "--project") options.project = path.resolve(required(args, ++index, arg));
    else if (arg === "--command") options.command = required(args, ++index, arg);
    else if (arg === "--validate") options.validate = required(args, ++index, arg);
    else if (arg === "--max-retries") options.maxRetries = positiveInt(required(args, ++index, arg), 3);
    else if (arg === "--timeout-ms") options.timeoutMs = positiveInt(required(args, ++index, arg), 60_000);
    else options.error += `${options.error ? " " : ""}${arg}`;
  }
  return options;
}

function required(args, index, flag) {
  if (!args[index] || args[index].startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return args[index];
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function printHelp() {
  console.log(`EEK v3.0 diagnosis and repair agent

Usage:
  npm run eek -- --dry-run --error "test is failing" --command "npm test"
  npm run eek -- --error "test is failing" --command "npm test"

Options:
  --error <text>       Bug report or error message
  --file <path>        Read the bug report from a file
  --project <path>     Project to inspect; default is the current folder
  --command <command>  Real reproduction command; default: npm test
  --validate <command> Real validation command; default: reproduction command
  --dry-run             Collect evidence without calling a model or changing files
  --apply               Keep a selected fix only after a second passing validation
  --max-retries <n>     Maximum specialist rounds; default: 3
  --timeout-ms <n>      Command timeout; default: 60000
`);
}
