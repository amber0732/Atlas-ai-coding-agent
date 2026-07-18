import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runCommand } from "./command-runner.mjs";

export async function validateCandidate({
  projectPath,
  candidate,
  validationCommand,
  timeoutMs = 60_000,
  captureFullOutput = false
}) {
  if (candidate?.error) {
    return notRun(`Specialist failed: ${candidate.error}`);
  }

  let restore;
  try {
    restore = await applyCandidateEdits(projectPath, candidate.edits);
    const execution = await runCommand({
      command: validationCommand,
      cwd: projectPath,
      timeoutMs,
      ...(captureFullOutput ? { maxOutputChars: null } : {})
    });
    return {
      verified: execution.ok,
      reason: execution.ok ? "The validator command passed after the candidate edits." : "The validator command failed after the candidate edits.",
      command: validationCommand,
      execution,
      testRun: testRun(execution),
      editCount: candidate.edits.length,
      editResults: restore.editResults
    };
  } catch (error) {
    return notRun(`Candidate could not be applied: ${error.message}`, error.editResults || []);
  } finally {
    if (restore) await restore();
  }
}

export async function commitCandidate({
  projectPath,
  candidate,
  validationCommand,
  timeoutMs = 60_000
}) {
  let restore;
  try {
    restore = await applyCandidateEdits(projectPath, candidate.edits);
    const execution = await runCommand({ command: validationCommand, cwd: projectPath, timeoutMs });
    if (execution.ok) {
      return { applied: true, verified: true, command: validationCommand, execution };
    }
    await restore();
    restore = null;
    return { applied: false, verified: false, command: validationCommand, execution, reason: "The final validation failed, so the files were restored." };
  } catch (error) {
    if (restore) await restore();
    return { applied: false, verified: false, reason: `The change was not kept: ${error.message}` };
  }
}

export async function applyCandidateEdits(projectPath, edits) {
  if (!Array.isArray(edits) || edits.length === 0) {
    throw withEditResults(new Error("The candidate contains no file edits."), []);
  }

  const backups = [];
  const workingContents = new Map();
  const editResults = [];
  try {
    for (const edit of edits) {
      const editResult = {
        path: edit?.path ?? "",
        before: typeof edit?.before === "string" ? edit.before : null,
        after: typeof edit?.after === "string" ? edit.after : null,
        matched: false,
        applied: false,
        rolledBack: false
      };
      editResults.push(editResult);
      try {
        const target = safeTarget(projectPath, edit?.path);
        if (typeof edit?.before !== "string" || typeof edit?.after !== "string") {
          throw new Error(`Edit for ${edit?.path || "unknown file"} must include before and after text.`);
        }
        await access(target);
        const current = workingContents.has(target)
          ? workingContents.get(target)
          : await readFile(target, "utf8");
        if (edit.before === edit.after) throw new Error(`Edit for ${edit.path} does not change anything.`);
        if (!current.includes(edit.before)) {
          throw new Error(`Expected text was not found in ${edit.path}; the candidate is stale.`);
        }
        const occurrences = current.split(edit.before).length - 1;
        editResult.matchCount = occurrences;
        if (occurrences !== 1) {
          throw new Error(`Expected text occurs ${occurrences} times in ${edit.path}; refusing an ambiguous edit.`);
        }
        editResult.matched = true;
        if (!backups.some((backup) => backup.target === target)) {
          backups.push({ target, original: await readFile(target, "utf8") });
        }
        const updated = current.replace(edit.before, edit.after);
        workingContents.set(target, updated);
        await writeFile(target, updated, "utf8");
        editResult.applied = true;
      } catch (error) {
        editResult.failure = error.message;
        throw error;
      }
    }
  } catch (error) {
    await restoreBackups(backups);
    for (const result of editResults) {
      if (result.applied) result.rolledBack = true;
    }
    throw withEditResults(error, editResults);
  }

  let restored = false;
  return async function restore() {
    if (restored) return;
    restored = true;
    await restoreBackups(backups);
    for (const result of editResults) {
      if (result.applied) result.rolledBack = true;
    }
  };
  restore.editResults = editResults;
  return restore;
}

async function restoreBackups(backups) {
  for (const backup of [...backups].reverse()) {
    await writeFile(backup.target, backup.original, "utf8");
  }
}

function safeTarget(projectPath, relativePath) {
  const relative = String(relativePath || "").replaceAll("\\", "/");
  if (!relative || relative.startsWith("/") || relative.split("/").includes("..")) {
    throw new Error(`Unsafe edit path: ${relativePath}`);
  }
  const root = path.resolve(projectPath);
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Unsafe edit path: ${relativePath}`);
  return target;
}

function withEditResults(error, editResults) {
  error.editResults = editResults;
  return error;
}

function notRun(reason, editResults = []) {
  return {
    verified: false,
    reason,
    editResults,
    testRun: { executed: false, stdout: "", stderr: "" }
  };
}

function testRun(execution) {
  return {
    executed: true,
    exitCode: execution.exitCode,
    timedOut: execution.timedOut,
    stdout: execution.stdout,
    stderr: execution.stderr
  };
}
