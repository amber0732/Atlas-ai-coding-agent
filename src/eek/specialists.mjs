export const SPECIALIST_SYSTEM_PROMPT = `You are an autonomous senior kernel engineer in the EEK v1.0 execution engine.
Your sole job is to produce a valid, minimal JSON patch for the reported issue.

STRICT CONSTRAINTS:
1. Output MUST be a single raw JSON object matching the schema below.
2. DO NOT output conversational filler, preambles, apologies, or markdown prose outside the JSON block.
3. NEVER assume or invent file paths. Only reference files proven to exist in the repository tree or stack trace.
4. Target minimal diffs rather than entire file rewrites.

JSON OUTPUT SCHEMA:
{
  "target_file": "path/to/file.ext",
  "reasoning_summary": "Brief 1-sentence explanation of the root cause fix",
  "action": "modify" | "create" | "delete",
  "patch": "Unified git diff format (- deleted, + added)"
}`;

const FRAMINGS = [
  "Analyze it primarily as a logic or data-flow problem.",
  "Analyze it primarily as a state, timing, or boundary problem.",
  "Analyze it primarily as an integration, configuration, or environment problem."
];

export async function runSpecialists({ llmClient, bugReport, triageResult, evidence, priorFailures = [] }) {
  const prompts = FRAMINGS.slice(0, triageResult.specialistCount);
  const results = await Promise.all(prompts.map(async (framing, index) => {
    const input = JSON.stringify({
      task: bugReport,
      triage: triageResult,
      framing,
      evidence,
      priorValidationFailures: priorFailures
    }, null, 2);

    let raw = null;
    try {
      raw = await llmClient.complete({
        instructions: `${SPECIALIST_SYSTEM_PROMPT}\n\nSpecialist Assignment: You are Specialist ${index + 1}. Perspective: ${framing}`,
        input
      });
      return { ...parseCandidate(raw), specialist: index + 1, raw };
    } catch (error) {
      return { specialist: index + 1, error: error.message, raw };
    }
  }));

  return results;
}

export function parseCandidate(raw) {
  const text = String(raw || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Specialist did not return JSON.");
  const candidate = JSON.parse(text.slice(start, end + 1));
  if (!candidate || typeof candidate !== "object") throw new Error("Specialist returned a non-object.");

  // Support single patch contract schema: { target_file, reasoning_summary, action, patch }
  if (candidate.target_file && candidate.patch && !candidate.edits) {
    candidate.edits = parsePatchToEdits(candidate.target_file, candidate.patch, candidate.action);
    candidate.fix_summary = candidate.reasoning_summary || "Patch applied from specialist.";
    candidate.diagnosis = candidate.reasoning_summary || "Diagnostic patch generated.";
    candidate.root_cause = candidate.reasoning_summary || "Root cause identified.";
    candidate.validation_commands = candidate.validation_commands || [];
  }

  if (!Array.isArray(candidate.edits)) {
    throw new Error("Specialist response is missing edits or target_file/patch.");
  }
  if (!Array.isArray(candidate.validation_commands)) {
    candidate.validation_commands = [];
  }
  return candidate;
}

export function parsePatchToEdits(targetFile, patchText, action = "modify") {
  if (typeof patchText !== "string") return [];
  const lines = patchText.split("\n");
  const beforeLines = [];
  const afterLines = [];

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      continue;
    }
    if (line.startsWith("-")) {
      beforeLines.push(line.slice(1));
    } else if (line.startsWith("+")) {
      afterLines.push(line.slice(1));
    } else {
      const context = line.startsWith(" ") ? line.slice(1) : line;
      beforeLines.push(context);
      afterLines.push(context);
    }
  }

  const before = beforeLines.join("\n").trim();
  const after = afterLines.join("\n").trim();

  return [{
    path: targetFile,
    before,
    after,
    action
  }];
}
