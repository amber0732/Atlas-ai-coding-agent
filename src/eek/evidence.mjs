import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./command-runner.mjs";

const DEFAULT_FILES = ["package.json", "README.md"];
const FILE_PATTERN = /[A-Za-z0-9_./\\-]+\.(?:cjs|css|html|js|json|jsx|mjs|py|rs|ts|tsx|yml|yaml)/g;

export async function collectEvidence({
  projectPath,
  bugReport,
  reproCommand = "npm test",
  files = [],
  timeoutMs = 60_000
}) {
  const root = path.resolve(projectPath);
  await access(root);

  const reproduction = await runCommand({ command: reproCommand, cwd: root, timeoutMs });
  const gitStatus = await runCommand({ command: "git status --short", cwd: root, timeoutMs: 15_000 });
  const gitDiff = await runCommand({ command: "git diff --no-ext-diff -- .", cwd: root, timeoutMs: 15_000 });
  const relevantFiles = await readRelevantFiles({ root, bugReport, files });

  return {
    collectedAt: new Date().toISOString(),
    projectPath: root,
    reproduction,
    gitStatus,
    gitDiff,
    relevantFiles,
    reproducible: !reproduction.ok,
    limitations: [
      ...(gitStatus.ok ? [] : ["Git status could not be collected."]),
      ...(gitDiff.ok ? [] : ["Git diff could not be collected."])
    ]
  };
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
