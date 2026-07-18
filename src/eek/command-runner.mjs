import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_CHARS = 30_000;
const FULL_OUTPUT_MAX_BUFFER_CHARS = 10_000_000;

export async function runCommand({
  command,
  cwd,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
  env = {}
}) {
  if (!String(command || "").trim()) {
    throw new Error("Cannot execute an empty command.");
  }
  await access(cwd);

  const executable = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const args = process.platform === "win32"
    ? ["/d", "/c", command]
    : ["-lc", command];

  const startedAt = new Date().toISOString();
  try {
    const result = await execFileAsync(executable, args, {
      cwd,
      env: { ...process.env, ...env },
      timeout: timeoutMs,
      maxBuffer: maxOutputChars === null
        ? FULL_OUTPUT_MAX_BUFFER_CHARS
        : Math.max(maxOutputChars * 2, 100_000),
      windowsHide: true
    });
    return normalizeResult({
      command,
      cwd,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: false,
      maxOutputChars
    });
  } catch (error) {
    return normalizeResult({
      command,
      cwd,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: Number.isInteger(error.code) ? error.code : null,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || String(error),
      timedOut: error.killed === true || error.signal === "SIGTERM",
      maxOutputChars
    });
  }
}

function normalizeResult(result) {
  return {
    ...result,
    stdout: trimOutput(result.stdout, result.maxOutputChars),
    stderr: trimOutput(result.stderr, result.maxOutputChars),
    ok: result.exitCode === 0 && !result.timedOut
  };
}

function trimOutput(value, maxChars) {
  const text = String(value || "");
  if (maxChars === null) return text;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n...[output truncated]`;
}
