const KERNEL_RULES = `
Evidence before assumption. Never invent logs, stack traces, commands, or test results.
Prefer the smallest change that fixes the root cause and preserve existing patterns.
State uncertainty clearly. Return only JSON matching the requested shape.
`;

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

    try {
      const raw = await llmClient.complete({
        instructions: `${KERNEL_RULES}\nYou are Specialist ${index + 1}. Produce an independent diagnosis and repair candidate.\n\nReturn JSON with exactly these fields:\n{\"diagnosis\": string, \"root_cause\": string, \"fix_summary\": string, \"edits\": [{\"path\": string, \"before\": string, \"after\": string}], \"validation_commands\": [string], \"confidence\": \"low\"|\"medium\"|\"high\"}`,
        input
      });
      return { ...parseCandidate(raw), specialist: index + 1, raw };
    } catch (error) {
      return { specialist: index + 1, error: error.message };
    }
  }));

  return results;
}

function parseCandidate(raw) {
  const text = String(raw || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Specialist did not return JSON.");
  const candidate = JSON.parse(text.slice(start, end + 1));
  if (!candidate || typeof candidate !== "object") throw new Error("Specialist returned a non-object.");
  if (!Array.isArray(candidate.edits) || !Array.isArray(candidate.validation_commands)) {
    throw new Error("Specialist response is missing edits or validation_commands.");
  }
  return candidate;
}
