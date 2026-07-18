#!/usr/bin/env node
import "dotenv/config";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_MAX_OUTPUT_TOKENS = 1400;
const DEFAULT_MAX_CONTEXT_CHARS = 12000;
const DEFAULT_MAX_FILES = 20;

main().catch((error) => {
  console.error(`GPT failed: ${redact(String(error?.stack || error?.message || error))}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const promptPath = path.join(projectRoot, "prompts", "eos-v2.md");
  const instructions = await readFile(promptPath, "utf8");

  let userProblem = options.text.trim();
  if (options.file) {
    userProblem += `${userProblem ? "\n\n" : ""}${await readTextFile(options.file)}`;
  }

  if (!userProblem) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const projectContext = options.project
    ? await collectProjectContext(options.project, options.maxFiles, options.maxContextChars)
    : "";

  const finalInput = buildInput({
    mode: options.mode,
    userProblem: redact(userProblem),
    projectContext: redact(projectContext)
  });

  if (options.dryRun) {
    console.log("GPT dry run OK.");
    console.log(`Prompt file: ${path.relative(process.cwd(), promptPath)}`);
    console.log(`Mode: ${options.mode}`);
    console.log(`Input characters: ${finalInput.length}`);
    console.log(`Project context included: ${projectContext ? "yes" : "no"}`);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY. Set it in your environment before running the agent.");
    process.exitCode = 1;
    return;
  }

  const model = process.env.GPT_MODEL || process.env.OPENAI_MODEL;
  if (!model) {
    console.error("Missing GPT_MODEL. Set it to a model available in your OpenAI account.");
    process.exitCode = 1;
    return;
  }

  const maxOutputTokens = parseInteger(
    process.env.GPT_MAX_OUTPUT_TOKENS,
    DEFAULT_MAX_OUTPUT_TOKENS
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: finalInput }
      ],
      max_tokens: maxOutputTokens
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error(`OpenAI API error ${response.status}:`);
    console.error(redact(responseText));
    process.exitCode = 1;
    return;
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    console.log(redact(responseText));
    return;
  }

  console.log(redact(extractResponseText(payload)));
}

function parseArgs(args) {
  const options = {
    dryRun: false,
    file: "",
    help: false,
    maxContextChars: DEFAULT_MAX_CONTEXT_CHARS,
    maxFiles: DEFAULT_MAX_FILES,
    mode: "concise",
    project: "",
    text: ""
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--file") {
      options.file = requiredValue(args, ++index, "--file");
    } else if (arg === "--project") {
      options.project = requiredValue(args, ++index, "--project");
    } else if (arg === "--mode") {
      options.mode = requiredValue(args, ++index, "--mode");
    } else if (arg === "--max-files") {
      options.maxFiles = parseInteger(requiredValue(args, ++index, "--max-files"), DEFAULT_MAX_FILES);
    } else if (arg === "--max-context-chars") {
      options.maxContextChars = parseInteger(
        requiredValue(args, ++index, "--max-context-chars"),
        DEFAULT_MAX_CONTEXT_CHARS
      );
    } else {
      options.text += `${options.text ? " " : ""}${arg}`;
    }
  }

  return options;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function printHelp() {
  console.log(`GPT EOS Agent

Usage:
  node src/index.mjs "paste an error or engineering problem"
  node src/index.mjs --file examples/error-report.md
  node src/index.mjs --project C:\\path\\to\\project --file examples/error-report.md

Options:
  --dry-run                 Validate prompt assembly without calling the API
  --file <path>             Read the problem from a text/markdown file
  --project <path>          Include limited, redacted project context
  --mode <concise|full>     Hint response depth; default is concise
  --max-files <number>      Project context file limit; default ${DEFAULT_MAX_FILES}
  --max-context-chars <n>   Project context character limit; default ${DEFAULT_MAX_CONTEXT_CHARS}
  --help                    Show this help

Environment:
  OPENAI_API_KEY            Required for API calls
  GPT_MODEL                 Required for API calls
  GPT_MAX_OUTPUT_TOKENS     Optional, default ${DEFAULT_MAX_OUTPUT_TOKENS}
`);
}

async function readTextFile(filePath) {
  const absolute = path.resolve(filePath);
  return redact(await readFile(absolute, "utf8"));
}

async function collectProjectContext(projectPath, maxFiles, maxContextChars) {
  const root = path.resolve(projectPath);
  await access(root);

  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
    "target",
    "vendor"
  ]);

  const allowedExtensions = new Set([
    ".cjs",
    ".css",
    ".html",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".mjs",
    ".prisma",
    ".ts",
    ".tsx",
    ".yml",
    ".yaml"
  ]);

  const preferredFiles = new Set([
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "vite.config.js",
    "vite.config.ts",
    "prisma/schema.prisma",
    "README.md"
  ]);

  const queue = [root];
  const files = [];

  while (queue.length && files.length < maxFiles) {
    const current = queue.shift();
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          queue.push(absolute);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isSensitiveFile(entry.name, relative)) {
        continue;
      }

      const extension = path.extname(entry.name);
      const preferred = preferredFiles.has(relative);
      if (!preferred && !allowedExtensions.has(extension)) {
        continue;
      }

      files.push({ absolute, relative, preferred });
      if (files.length >= maxFiles) {
        break;
      }
    }
  }

  files.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.relative.localeCompare(b.relative));

  let context = `Project root: ${root}\n`;
  for (const file of files.slice(0, maxFiles)) {
    const info = await stat(file.absolute);
    if (info.size > 80_000) {
      continue;
    }

    const content = redact(await readFile(file.absolute, "utf8"));
    const remaining = maxContextChars - context.length;
    if (remaining <= 0) {
      break;
    }

    const snippet = content.slice(0, Math.max(0, remaining - 200));
    context += `\n--- ${file.relative} ---\n${snippet}\n`;
  }

  return context.slice(0, maxContextChars);
}

function isSensitiveFile(name, relative) {
  const lowerName = name.toLowerCase();
  const lowerRelative = relative.toLowerCase();
  return (
    lowerName === ".env" ||
    lowerName.startsWith(".env.") ||
    lowerRelative.includes("secret") ||
    lowerRelative.includes("credential") ||
    lowerRelative.endsWith(".pem") ||
    lowerRelative.endsWith(".key")
  );
}

function buildInput({ mode, userProblem, projectContext }) {
  return `Mode: ${mode}

User problem:
${userProblem}

Project context:
${projectContext || "(No project context provided.)"}

Required behavior:
- Use EOS v2.0.
- Keep the answer concise unless the problem requires depth.
- Identify facts, assumptions, root cause, solution, validation, risks, and confidence only where useful.
- Do not invent verification.`;
}

function extractResponseText(payload) {
  return payload?.choices?.[0]?.message?.content || JSON.stringify(payload, null, 2);
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function redact(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-[REDACTED]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");
}

