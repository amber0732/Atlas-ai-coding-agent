export function renderReport({
  status,
  triageResult,
  evidence,
  rounds,
  arbiterResult,
  commitResult,
  escalationReason,
  dryRun = false
}) {
  const lines = [
    `# EEK v1.0 Diagnosis Report`,
    `Status: ${status}`,
    `Triage: ${triageResult.level} (${triageResult.route})`,
    ""
  ];

  if (dryRun) {
    lines.push(
      "## Evidence Preview",
      `Reproduction command: \`${evidence.reproduction.command}\``,
      `Exit code: ${formatExitCode(evidence.reproduction)}`,
      "",
      "### Captured stdout",
      fenced(evidence.reproduction.stdout),
      "### Captured stderr",
      fenced(evidence.reproduction.stderr),
      "",
      "No specialist or repair call was made because this was a dry run."
    );
    return lines.join("\n");
  }

  if (arbiterResult) {
    const candidate = arbiterResult.selected.candidate;
    lines.push(
      "## Diagnosis",
      candidate.diagnosis || "Not provided.",
      "",
      "## Root Cause",
      candidate.root_cause || "Not provided.",
      "",
      "## Fix",
      candidate.fix_summary || "Not provided.",
      ...candidate.edits.map((edit) => "- `" + edit.path + "` was changed with an exact, bounded replacement."),
      "",
      "## Validation Evidence",
      `Command: \`${arbiterResult.selected.validation.command}\``,
      `Exit code: ${formatExitCode(arbiterResult.selected.validation.execution)}`,
      "",
      "### stdout",
      fenced(arbiterResult.selected.validation.execution.stdout),
      "### stderr",
      fenced(arbiterResult.selected.validation.execution.stderr),
      "",
      "## Confidence",
      candidate.confidence || "medium",
      "",
      "## Arbitration",
      arbiterResult.rationale,
      `Validated candidates considered: ${arbiterResult.verifiedCount}.`,
      "",
      "## Open Risks / Not Verified",
      ...(evidence.limitations.length ? evidence.limitations.map((item) => `- ${item}`) : ["- No additional limitations were recorded."]),
      ...(commitResult?.applied ? ["- The selected change was kept after a second validation run."] : ["- The validated change was rolled back. Use the explicit apply option to keep it."])
    );
    return lines.join("\n");
  }

  lines.push(
    "## Diagnosis",
    "No verified repair was produced.",
    "",
    "## Validation Evidence",
    `Reproduction command: \`${evidence.reproduction.command}\``,
    `Exit code: ${formatExitCode(evidence.reproduction)}`,
    "",
    "### stdout",
    fenced(evidence.reproduction.stdout),
    "### stderr",
    fenced(evidence.reproduction.stderr),
    "",
    "## Open Risks / Not Verified",
    `- ${escalationReason || "All proposed candidates failed grounded validation."}`,
    `- Retry rounds used: ${rounds}.`,
    "",
    "No claim of a verified fix is being made."
  );
  return lines.join("\n");
}

function fenced(value) {
  return ["```text", String(value || "(none)"), "```"].join("\n");
}

function formatExitCode(result) {
  return result.timedOut ? "timeout" : result.exitCode === null ? "unknown" : String(result.exitCode);
}
