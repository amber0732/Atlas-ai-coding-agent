import { arbitrate } from "./arbiter.mjs";
import { collectEvidence } from "./evidence.mjs";
import { createLlmClient } from "./llm-client.mjs";
import { renderReport } from "./reporter.mjs";
import { runSpecialists } from "./specialists.mjs";
import { triage } from "./triage.mjs";
import { commitCandidate, validateCandidate } from "./validator.mjs";

export async function runEek({
  projectPath,
  bugReport,
  reproCommand = "npm test",
  validationCommand = reproCommand,
  files = [],
  timeoutMs = 60_000,
  maxRetries = 3,
  dryRun = false,
  apply = false,
  llmClient = createLlmClient()
}) {
  const phaseLog = [];
  const record = (phase, details = {}) => phaseLog.push({ at: new Date().toISOString(), phase, ...details });
  const triageResult = triage(bugReport);
  record("triage", triageResult);
  const evidence = await collectEvidence({ projectPath, bugReport, reproCommand, files, timeoutMs });
  record("evidence_collected", {
    reproduction: evidence.reproduction,
    gitStatus: evidence.gitStatus,
    gitDiff: evidence.gitDiff,
    relevantFileCount: evidence.relevantFiles.length
  });

  if (dryRun) {
    return {
      status: "dry_run",
      report: renderReport({ status: "dry_run", triageResult, evidence, rounds: 0, dryRun: true }),
      triageResult,
      evidence,
      phaseLog
    };
  }

  if (!evidence.reproducible) {
    record("escalation", { reason: "Evidence collection could not reproduce a failing command." });
    return blockedResult({ triageResult, evidence, rounds: 0, reason: "Evidence collection could not reproduce a failing command.", phaseLog });
  }

  if (!llmClient || llmClient.configured === false || typeof llmClient.complete !== "function") {
    record("escalation", { reason: "No language-model client is configured." });
    return blockedResult({ triageResult, evidence, rounds: 0, reason: "No language-model client is configured.", phaseLog });
  }

  let priorFailures = [];
  let lastValidations = [];
  for (let round = 1; round <= maxRetries; round += 1) {
    const candidates = await runSpecialists({ llmClient, bugReport, triageResult, evidence, priorFailures });
    record("specialists_completed", {
      round,
      count: candidates.length,
      failures: candidates.filter((candidate) => candidate.error).map((candidate) => candidate.error)
    });
    lastValidations = [];

    for (const candidate of candidates) {
      const validation = await validateCandidate({
        projectPath,
        candidate,
        validationCommand,
        timeoutMs
      });
      lastValidations.push({ candidate, validation });
      record("candidate_validated", {
        round,
        specialist: candidate.specialist,
        validation
      });
    }

    const arbiterResult = arbitrate(lastValidations.map(({ candidate, validation }) => ({ candidate, validation, verified: validation.verified })));
    if (arbiterResult) {
      record("arbitration", {
        round,
        verifiedCount: arbiterResult.verifiedCount,
        rationale: arbiterResult.rationale
      });
      let commitResult = null;
      if (apply) {
        commitResult = await commitCandidate({ projectPath, candidate: arbiterResult.selected.candidate, validationCommand, timeoutMs });
        if (!commitResult.applied) {
          record("escalation", { reason: commitResult.reason || "The selected fix failed its final validation and was restored." });
          return blockedResult({ triageResult, evidence, rounds: round, reason: commitResult.reason || "The selected fix failed its final validation and was restored.", phaseLog });
        }
        record("change_applied", { round, commitResult });
      }
      record("completion", { status: "verified", round });
      return {
        status: "verified",
        report: renderReport({ status: "verified", triageResult, evidence, rounds: round, arbiterResult, commitResult }),
        triageResult,
        evidence,
        arbiterResult,
        commitResult,
        rounds: round,
        phaseLog
      };
    }

    priorFailures = lastValidations.map(({ candidate, validation }) => ({
      specialist: candidate.specialist,
      reason: validation.reason,
      command: validation.command,
      exitCode: validation.execution?.exitCode,
      stdout: validation.execution?.stdout,
      stderr: validation.execution?.stderr
    }));
    record("retry", { round, failures: priorFailures });
  }

  record("escalation", { reason: `All candidates failed grounded validation after ${maxRetries} retry round${maxRetries === 1 ? "" : "s"}. Human review is required.` });
  return blockedResult({
    triageResult,
    evidence,
    rounds: maxRetries,
    reason: `All candidates failed grounded validation after ${maxRetries} retry round${maxRetries === 1 ? "" : "s"}. Human review is required.`,
    phaseLog
  });
}

function blockedResult({ triageResult, evidence, rounds, reason, phaseLog }) {
  return {
    status: "escalated",
    report: renderReport({
      status: "escalated",
      triageResult,
      evidence,
      rounds,
      escalationReason: reason
    }),
    triageResult,
    evidence,
    rounds,
    escalationReason: reason,
    phaseLog
  };
}
