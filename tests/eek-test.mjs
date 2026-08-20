import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runEek } from "../src/eek/orchestrator.mjs";
import { applyCandidateEdits } from "../src/eek/validator.mjs";
import { triage } from "../src/eek/triage.mjs";

assert.equal(triage("Cannot find name UserId").level, "trivial");
assert.equal(triage("An intermittent race condition appears between two workers").level, "complex");
assert.equal(triage("The search result is wrong for one account").level, "standard");

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "eek-test-"));
const target = path.join(temporaryRoot, "sample.txt");
await writeFile(target, "before\n", "utf8");

const restore = await applyCandidateEdits(temporaryRoot, [{
  path: "sample.txt",
  before: "before",
  after: "after"
}]);
assert.equal(await readFile(target, "utf8"), "after\n");
await restore();
assert.equal(await readFile(target, "utf8"), "before\n");

const failingProject = await mkdtemp(path.join(os.tmpdir(), "eek-integration-"));
const failingTarget = path.join(failingProject, "sample.txt");
await writeFile(failingTarget, "bad", "utf8");
await writeFile(path.join(failingProject, "check.mjs"), "import { readFile } from 'node:fs/promises';\nprocess.exit((await readFile('sample.txt', 'utf8')) === 'good' ? 0 : 1);\n", "utf8");
const checkCommand = "node check.mjs";
const fakeCandidate = {
  diagnosis: "The sample contains the wrong value.",
  root_cause: "The value is bad instead of good.",
  fix_summary: "Replace the bad value with the good value.",
  edits: [{ path: "sample.txt", before: "bad", after: "good" }],
  validation_commands: [checkCommand],
  confidence: "high"
};
const fakeClient = {
  configured: true,
  complete: async () => JSON.stringify(fakeCandidate)
};

const rolledBack = await runEek({
  projectPath: failingProject,
  bugReport: "The sample check is failing.",
  reproCommand: checkCommand,
  validationCommand: checkCommand,
  llmClient: fakeClient,
  maxRetries: 1
});
assert.equal(rolledBack.status, "verified");
assert.equal(await readFile(failingTarget, "utf8"), "bad");

const applied = await runEek({
  projectPath: failingProject,
  bugReport: "The sample check is failing.",
  reproCommand: checkCommand,
  validationCommand: checkCommand,
  llmClient: fakeClient,
  maxRetries: 1,
  apply: true
});
assert.equal(applied.status, "verified");
assert.equal(applied.commitResult.applied, true);
assert.equal(await readFile(failingTarget, "utf8"), "good");

// Test single patch contract schema
import { parseCandidate, SPECIALIST_SYSTEM_PROMPT } from "../src/eek/specialists.mjs";
assert.ok(SPECIALIST_SYSTEM_PROMPT.includes("JSON OUTPUT SCHEMA"));

const singlePatchCandidateRaw = JSON.stringify({
  target_file: "sample.txt",
  reasoning_summary: "Fix value from bad to good",
  action: "modify",
  patch: "-bad\n+good"
});
const parsed = parseCandidate(singlePatchCandidateRaw);
assert.equal(parsed.edits[0].path, "sample.txt");
assert.equal(parsed.edits[0].before, "bad");
assert.equal(parsed.edits[0].after, "good");
import { extractRepoName } from "../src/eek/orchestrator.mjs";
assert.equal(extractRepoName("Create a repository called atlas-agent-test"), "atlas-agent-test");
assert.equal(extractRepoName("Create a new public repo named 'data-scraper'"), "data-scraper");
assert.equal(extractRepoName("Make a GitHub repo `auth-service-v2`"), "auth-service-v2");
assert.equal(extractRepoName("Create a new repo backend-api"), "backend-api");
assert.equal(extractRepoName("Create a new repository"), "atlas-generated-repo");

await rm(temporaryRoot, { recursive: true, force: true });
await rm(failingProject, { recursive: true, force: true });
console.log("EEK tests passed.");


