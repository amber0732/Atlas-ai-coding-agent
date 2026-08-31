// EEK Engine v1.0 Orchestrator & Tool Execution Kernel
import { arbitrate } from "./arbiter.mjs";
import { collectEvidence } from "./evidence.mjs";
import { createLlmClient } from "./llm-client.mjs";
import { renderReport } from "./reporter.mjs";
import { runSpecialists } from "./specialists.mjs";
import { triage } from "./triage.mjs";
import { commitCandidate, validateCandidate } from "./validator.mjs";
import { listUserRepos, createRepo, commitFile } from "../tools/githubTools.mjs";
import { searchRealtimeWeb } from "../tools/searchTools.mjs";

/**
 * Available GitHub actions registered for tool-calling
 */
export const GITHUB_TOOL_DEFINITIONS = [
  {
    name: 'create_repo',
    description: 'Create a new GitHub repository for the user',
    parameters: {
      type: 'object',
      properties: {
        repoName: { type: 'string', description: 'The repository name' },
        isPrivate: { type: 'boolean', description: 'Whether the repo should be private' },
        description: { type: 'string', description: 'Repository summary' },
      },
      required: ['repoName'],
    },
  },
  {
    name: 'commit_file',
    description: 'Commit modified code directly to a GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'GitHub username or organization' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path inside the repo (e.g. src/index.js)' },
        content: { type: 'string', description: 'Full code contents of the file' },
        commitMessage: { type: 'string', description: 'Commit summary' },
      },
      required: ['owner', 'repo', 'path', 'content'],
    },
  },
];

/**
 * Token budget and sampling configurations per execution stage
 */

export const INFERENCE_CONFIG = {
  triage: {
    max_tokens: 200,
    temperature: 0.0,
    top_p: 0.1
  },
  chat: {
    max_tokens: 600,
    temperature: 0.3,
    top_p: 0.8
  },
  specialistPatch: {
    max_tokens: 2048,
    temperature: 0.1,
    top_p: 0.1
  }
};

/**
 * Sleep helper with promise
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust API caller with Exponential Backoff, Jitter, and Rate-Limit (429) self-healing
 */
export async function callLLM({ apiKey, baseURL, model, messages, config = {}, responseFormat = null, maxRetries = 4 }) {
  const key = apiKey || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;

  if (!key) {
    const errorMsg = "Unauthorized: NVIDIA_API_KEY is missing from environment variables.";
    console.error(`[NVIDIA LLM Error] HTTP 401: ${errorMsg}`);
    const err = new Error(errorMsg);
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const url = `${baseURL || 'https://integrate.api.nvidia.com/v1'}/chat/completions`;

  const payload = {
    model: model || process.env.NVIDIA_MODEL_NAME || "meta/llama-3.3-70b-instruct",
    messages,
    max_tokens: config?.max_tokens,
    temperature: config?.temperature,
    top_p: config?.top_p,
    stream: false
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
      });

      // 1. Success condition
      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content?.trim() || '';
      }

      // Log exact status code and body text for any non-ok response
      const errorText = await res.text();
      console.error(`[NVIDIA Remote API Error] Status Code: ${res.status}, Body: ${errorText}`);

      // 2. Rate Limit (429) or Transient Server Overload (503/504) handling
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        if (attempt === maxRetries) {
          const rateErr = new Error(`API Rate Limit (${res.status}) persisted after ${maxRetries} retries: ${errorText}`);
          // @ts-ignore
          rateErr.status = res.status;
          throw rateErr;
        }

        // Check if provider supplied a Retry-After header (in seconds)
        const retryAfterHeader = res.headers.get('retry-after') || res.headers.get('x-ratelimit-reset');
        let waitMs = 0;

        if (retryAfterHeader && !isNaN(retryAfterHeader)) {
          waitMs = parseFloat(retryAfterHeader) * 1000;
        } else {
          // Exponential backoff: 1.5s, 3s, 6s + randomized jitter (100ms - 500ms)
          const baseDelay = 1500 * Math.pow(2, attempt);
          const jitter = Math.floor(Math.random() * 400);
          waitMs = baseDelay + jitter;
        }

        console.warn(`[EEK Kernel] ⚠️ HTTP ${res.status} encountered. Auto-backing off for ${(waitMs / 1000).toFixed(1)}s (Attempt ${attempt + 1}/${maxRetries})...`);
        await sleep(waitMs);
        continue;
      }

      // 3. Unrecoverable Client/Auth/Server Errors (401, 403, 400, 500)
      const unrecoverableErr = new Error(`LLM Inference failed [HTTP ${res.status}]: ${errorText}`);
      // @ts-ignore
      unrecoverableErr.status = res.status;
      throw unrecoverableErr;

    } catch (err) {
      // If network error occurred and retries remain, back off and try again
      if (attempt < maxRetries && err.status !== 401 && err.status !== 400 && !err.message.includes('HTTP 401') && !err.message.includes('HTTP 400')) {
        const retryDelay = 1000 * Math.pow(2, attempt);
        console.warn(`[EEK Kernel] Network glitch: ${err.message}. Retrying in ${(retryDelay / 1000).toFixed(1)}s...`);
        await sleep(retryDelay);
      } else {
        console.error(`[NVIDIA Fetch Exception] Status Code: ${err.status || 500}, Message: ${err.message}`);
        throw err;
      }
    }
  }
}

/**
 * Stage 1: Intent Triage Router
 */
export async function triageIntent(userQuery, credentials = {}) {
  const messages = [
    {
      role: 'system',
      content: `Analyze the user prompt. Classify intent as either "PATCH" (bug fix, code modification, refactor, runtime error) or "CHAT" (general question, explanation, architecture inquiry).
Output ONLY a JSON object: {"intent": "PATCH" | "CHAT", "focus_files": ["optional/file/paths"]}`
    },
    { role: 'user', content: userQuery }
  ];

  try {
    const raw = await callLLM({
      ...credentials,
      messages,
      config: INFERENCE_CONFIG.triage,
      responseFormat: { type: 'json_object' }
    });
    return JSON.parse(raw);
  } catch {
    // Fallback: If query mentions error/fail/bug/fix, treat as PATCH
    const isPatch = /error|fail|bug|fix|patch|exception|traceback|undefined|cannot find/i.test(userQuery);
    return { intent: isPatch ? 'PATCH' : 'CHAT', focus_files: [] };
  }
}

/**
 * Parses fenced markdown JSON if model outputs markdown wrappers
 */
export function extractCleanJson(rawResponse) {
  try {
    return JSON.parse(rawResponse);
  } catch {
    const match = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Continue to fallback
      }
    }
    throw new Error(`Invalid JSON payload received from specialist: ${rawResponse.slice(0, 150)}...`);
  }
}

/**
 * Deterministically extracts the repository name from natural language prompts.
 * Handles explicit keywords, backticks, quotes, and ignores filler stop-words.
 */
export function extractRepoName(prompt) {
  const text = String(prompt || "");
  // 1. Highest Priority: Explicit keyword patterns ("called <name>", "named '<name>'", "titled `<name>`")
  const explicitMatch = text.match(/(?:called|named|titled)\s+[`"']?([a-zA-Z0-9_\-\.]+)[`"']?/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1];
  }

  // 2. Quoted / Backticked identifiers anywhere after 'repo' or 'repository'
  const quotedMatch = text.match(/(?:repo|repository)\s+.*?[`"']([a-zA-Z0-9_\-\.]+)[`"']/i);
  if (quotedMatch && quotedMatch[1]) {
    return quotedMatch[1];
  }

  // 3. Fallback: Direct word after repo/repository, filtering out common conversational stop-words
  const stopWords = new Set(['a', 'an', 'the', 'new', 'public', 'private', 'for', 'with', 'called', 'named']);
  const directMatch = text.match(/(?:repo|repository)\s+([a-zA-Z0-9_\-\.]+)/i);
  if (directMatch && directMatch[1] && !stopWords.has(directMatch[1].toLowerCase())) {
    return directMatch[1];
  }

  return 'atlas-generated-repo';
}

/**
 * Parses user prompt and routes to specific GitHub tool actions or standard LLM
 */
export async function runEEKOrchestrator({
  prompt,
  query,
  model,
  githubToken,
  cwd,
  reproductionLogs,
  credentials = {},
}) {
  const effectiveQuery = String(prompt || query || "").trim();
  const lower = effectiveQuery.toLowerCase();
  const modelName =
    process.env.NVIDIA_MODEL_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_MODEL ||
    process.env.GPT_MODEL ||
    "meta/llama-3.3-70b-instruct";
  const rawModel = model || credentials?.model;
  const effectiveModel =
    rawModel && !rawModel.includes("8b-instruct") ? rawModel : modelName;
  const apiKey = credentials?.apiKey || process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = credentials?.baseURL || process.env.OPENAI_API_BASE ||
    (apiKey?.startsWith("nvapi-") ? "https://integrate.api.nvidia.com/v1" : "https://api.openai.com/v1");

  // 1. Auth Guard for all GitHub Actions
  const isGitHubIntent =
    lower.includes("github") ||
    lower.includes("repo") ||
    lower.includes("commit") ||
    lower.includes("push");

  if (isGitHubIntent && !githubToken) {
    return "⚠️ Your GitHub account is not connected. Please click **Connect GitHub** in the top navigation bar to grant access.";
  }

  // 2. INTENT: Create Repository (and optional initial commit)
  if (isGitHubIntent && (lower.includes("create") || lower.includes("make") || lower.includes("new"))) {
    try {
      // Deterministic repo name extraction
      const repoName = extractRepoName(effectiveQuery);
      const isPrivate = lower.includes("private");

      // Step A: Create the repository
      const createdRepo = await createRepo(githubToken, {
        repoName,
        isPrivate,
        description: "Created autonomously by Atlas AI",
      });

      let response = `✅ **Repository Created Successfully!**\n\n`;
      response += `* **Repository URL:** [${createdRepo.fullName}](${createdRepo.url})\n`;
      response += `* **Visibility:** ${isPrivate ? "🔒 Private" : "🌐 Public"}\n\n`;

      // Step B: If user also requested a README or file commit
      if (lower.includes("readme") || lower.includes("file") || lower.includes("push")) {
        const userRes = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            "User-Agent": "Atlas-AI-Agent/1.0",
          },
        });
        const userData = await userRes.json();
        const owner = userData.login;

        const defaultContent = `# ${repoName}\n\nProject initialized autonomously by **Atlas AI**.\n\n### Tech Stack\n- Autonomous Agent Kernel\n- GitHub REST Tooling Integration`;

        const commitRes = await commitFile(githubToken, {
          owner,
          repo: repoName,
          path: "README.md",
          content: defaultContent,
          commitMessage: "Initial commit: add README.md via Atlas AI",
          branch: "main",
        });

        response += `📄 **Initial Commit Pushed:**\n`;
        response += `* **File:** \`README.md\`\n`;
        response += `* **Commit:** [View on GitHub](${commitRes.commitUrl})\n`;
      }

      return response;
    } catch (err) {
      console.error("[GitHub Create Error]:", err);
      return `⚠️ Failed to create repository: ${err.message}`;
    }
  }

  // 3. INTENT: List / Read Repositories
  if (
    isGitHubIntent &&
    (lower.includes("list") ||
      lower.includes("show") ||
      lower.includes("get") ||
      lower.includes("my repos") ||
      lower.includes("all"))
  ) {
    try {
      const repos = await listUserRepos(githubToken);

      if (!repos || repos.length === 0) {
        return 'Connected to GitHub successfully, but you have no repositories yet. Ask Atlas: *"Create a new repository called my-first-repo"*.';
      }

      let response = `### 📦 Your GitHub Repositories (${repos.length} Recent)\n\n`;
      repos.forEach((r, idx) => {
        response += `${idx + 1}. **[${r.name}](${r.url})** ${r.private ? "🔒 *(Private)*" : "🌐 *(Public)*"}\n`;
        response += `   *${r.description}* — \`${r.language || "Plain Text"}\` | ⭐ ${r.stars}\n\n`;
      });

      return response.trim();
    } catch (err) {
      console.error("[GitHub List Error]:", err);
      return `⚠️ Failed to fetch GitHub repositories: ${err.message}`;
    }
  }

  // If reproduction logs are present, run autonomous code patching pipeline
  if (reproductionLogs) {
    const evidence = await collectEvidence({
      cwd: cwd || process.cwd(),
      problem: effectiveQuery,
      reproduction: reproductionLogs,
    });

    const fileContexts = (evidence.referencedFiles || evidence.relevantFiles || [])
      .map((f) => `--- File: ${f.path} ---\n${f.content}`)
      .join("\n\n");

    const specialistMessages = [
      {
        role: "system",
        content: `You are a specialist kernel engineer. Return ONLY a single valid JSON patch object. No markdown explanations outside JSON.
JSON Schema:
{
  "target_file": "relative/path/to/file",
  "reasoning_summary": "1 sentence describing the fix",
  "action": "modify",
  "patch": "unified git diff"
}`,
      },
      {
        role: "user",
        content: `## Problem\n${evidence.problemStatement || effectiveQuery}

## Failure Logs\n${evidence.reproduction?.stderr || evidence.reproduction?.stdout || "None"}

## Directory Layout\n${evidence.projectTree || ""}

## Implicated Files\n${fileContexts || "No specific files identified yet."}`,
      },
    ];

    const rawPatchResponse = await callLLM({
      apiKey,
      baseURL,
      model: effectiveModel,
      messages: specialistMessages,
      config: INFERENCE_CONFIG.specialistPatch,
    });

    const parsedPatch = extractCleanJson(rawPatchResponse);

    return {
      type: "patch",
      plan: parsedPatch.reasoning_summary,
      targetFile: parsedPatch.target_file,
      patch: parsedPatch.patch,
      raw: parsedPatch,
    };
  }

  // 4. Live Web Search Query
  const isLiveQuery =
    lower.includes("latest") ||
    lower.includes("today") ||
    lower.includes("current") ||
    lower.includes("news") ||
    lower.includes("who is");

  if (isLiveQuery) {
    try {
      const liveData = await searchRealtimeWeb(effectiveQuery);

      // Inject live search results into the prompt context
      const enrichedPrompt = `Context from live web search:
${JSON.stringify(liveData.results, null, 2)}

User Question: ${effectiveQuery}

Present live facts directly and concisely with clean source citations, without explicitly explaining the context-injection mechanics to the user.`;

      return await callLLM({
        apiKey,
        baseURL,
        model: effectiveModel,
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable AI assistant. Present live facts directly and concisely with clean source citations, without explicitly explaining the context-injection mechanics to the user.",
          },
          { role: "user", content: enrichedPrompt },
        ],
        config: INFERENCE_CONFIG.chat || { max_tokens: 1000, temperature: 0.7 },
      });
    } catch (err) {
      console.error("[Search Error]:", err);
    }
  }

  // 5. Default: Standard LLM Pipeline
  return await callLLM({
    apiKey,
    baseURL,
    model: effectiveModel,
    messages: [
      {
        role: "system",
        content: "You are a concise, senior software architect. Answer questions directly without filler, preambles, or unprompted chatter.",
      },
      { role: "user", content: effectiveQuery },
    ],
    config: INFERENCE_CONFIG.chat || { max_tokens: 1000, temperature: 0.7 },
  });
}

/**
 * Full-cycle EEK multi-specialist repair and validation runner
 */
export async function runEek({
  projectPath,
  bugReport,
  reproCommand = "npm test",
  specialistCount = 2,
  validationCommand = reproCommand,
  files = [],
  timeoutMs = 60_000,
  maxRetries = 3,
  dryRun = false,
  apply = false,
  llmClient = createLlmClient(),
  traceLogger = null
}) {
  const phaseLog = [];
  const record = async (phase, details = {}) => {
    phaseLog.push({ at: new Date().toISOString(), phase, ...details });
    if (traceLogger) {
      await traceLogger.record(phase, details);
    }
  };
  const triageResult = triage(bugReport);
  await record("triage", triageResult);
  const evidence = await collectEvidence({ projectPath, bugReport, reproCommand, files, timeoutMs });
  await record("evidence_collected", {
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
    await record("escalation", { reason: "Evidence collection could not reproduce a failing command." });
    return blockedResult({ triageResult, evidence, rounds: 0, reason: "Evidence collection could not reproduce a failing command.", phaseLog });
  }

  if (!llmClient || llmClient.configured === false || typeof llmClient.complete !== "function") {
    await record("escalation", { reason: "No language-model client is configured." });
    return blockedResult({ triageResult, evidence, rounds: 0, reason: "No language-model client is configured.", phaseLog });
  }

  let priorFailures = [];
  let lastValidations = [];
  for (let round = 1; round <= maxRetries; round += 1) {
    const candidates = await runSpecialists({ llmClient, bugReport, triageResult, evidence, priorFailures });
    await record("specialists_completed", {
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

      if (traceLogger) {
        await traceLogger.record("candidate_trace", {
          round,
          specialist: candidate.specialist,
          raw: candidate.raw,
          edits: candidate.edits,
          editResults: validation.editResults,
          validation: validation.testRun
        });
      }

      await record("candidate_validated", {
        round,
        specialist: candidate.specialist,
        validation
      });
    }

    const arbiterResult = arbitrate(lastValidations.map(({ candidate, validation }) => ({ candidate, validation, verified: validation.verified })));
    if (arbiterResult) {
      await record("arbitration", {
        round,
        verifiedCount: arbiterResult.verifiedCount,
        rationale: arbiterResult.rationale
      });
      let commitResult = null;
      if (apply) {
        commitResult = await commitCandidate({ projectPath, candidate: arbiterResult.selected.candidate, validationCommand, timeoutMs });
        if (!commitResult.applied) {
          await record("escalation", { reason: commitResult.reason || "The selected fix failed its final validation and was restored." });
          return blockedResult({ triageResult, evidence, rounds: round, reason: commitResult.reason || "The selected fix failed its final validation and was restored.", phaseLog });
        }
        await record("change_applied", { round, commitResult });
      }
      await record("completion", { status: "verified", round });
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
    await record("retry", { round, failures: priorFailures });
  }

  await record("escalation", { reason: `All candidates failed grounded validation after ${maxRetries} retry round${maxRetries === 1 ? "" : "s"}. Human review is required.` });
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
