import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./command-runner.mjs";

const DEFAULT_FILES = ["package.json", "README.md"];
const FILE_PATTERN = /[A-Za-z0-9_./\\-]+\.(?:cjs|css|html|js|json|jsx|mjs|py|rs|ts|tsx|yml|yaml)/g;

export async function collectEvidence({
  projectPath,
  cwd,
  bugReport,
  problem,
  reproCommand = "npm test",
  reproduction: reproductionInput,
  files = [],
  timeoutMs = 60_000
}) {
  const root = path.resolve(cwd || projectPath || process.cwd());
  await access(root);

  const problemStatement = bugReport || problem || "";
  let reproduction;
  if (reproductionInput && typeof reproductionInput === "object") {
    reproduction = reproductionInput;
  } else if (typeof reproductionInput === "string") {
    reproduction = { stdout: reproductionInput, stderr: "", ok: false };
  } else {
    reproduction = await runCommand({ command: reproCommand, cwd: root, timeoutMs });
  }

  const gitStatus = await runCommand({ command: "git status --short", cwd: root, timeoutMs: 15_000 });
  const gitDiff = await runCommand({ command: "git diff --no-ext-diff -- .", cwd: root, timeoutMs: 15_000 });
  const projectTree = await buildProjectTree(root);
  const reproLogs = `${reproduction.stdout || ""} ${reproduction.stderr || ""}`;
  const relevantFiles = await readRelevantFiles({ root, bugReport: `${problemStatement} ${reproLogs}`, files });

  return {
    collectedAt: new Date().toISOString(),
    projectPath: root,
    problemStatement,
    reproduction,
    gitStatus,
    gitDiff,
    projectTree,
    relevantFiles,
    referencedFiles: relevantFiles,
    reproducible: !reproduction.ok,
    limitations: [
      ...(gitStatus.ok ? [] : ["Git status could not be collected."]),
      ...(gitDiff.ok ? [] : ["Git diff could not be collected."])
    ]
  };
}

async function buildProjectTree(root, maxDepth = 2, currentDepth = 0) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const lines = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "out") continue;
      if (entry.isDirectory() && currentDepth < maxDepth) {
        lines.push(`${"  ".repeat(currentDepth)}📁 ${entry.name}/`);
        const sub = await buildProjectTree(path.join(root, entry.name), maxDepth, currentDepth + 1);
        if (sub) lines.push(sub);
      } else if (entry.isFile()) {
        lines.push(`${"  ".repeat(currentDepth)}📄 ${entry.name}`);
      }
    }
    return lines.join("\n");
  } catch {
    return "(Unable to read directory tree)";
  }
}

async function readRelevantFiles({ root, bugReport, files }) {
  const candidates = new Set([...DEFAULT_FILES, ...files, ...(String(bugReport).match(FILE_PATTERN) || [])]);
  const results = [];

  for (const candidate of candidates) {
    const relative = candidate.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!relative || relative.startsWith("/") || relative.split("/").includes("..")) continue;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) continue;

    try {
      const content = await readFile(absolute, "utf8");
      results.push({ path: relative, content: content.slice(0, 20_000) });
    } catch {
      // A path mentioned in an error may no longer exist; record only readable evidence.
    }
  }

  return results;
}

