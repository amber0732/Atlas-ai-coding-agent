// server.js - EEK v1.0 web demo server (hackathon edition)
// No build step, no React. Just Express + the existing CLI as a child process.
import "dotenv/config";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { sanitizeModel } from "./src/eek/orchestrator.mjs";

// Express is a CJS package; we use createRequire to bridge ESM -> CJS gap.
const require = createRequire(import.meta.url);
const express = require("express");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Demo project registry
// ---------------------------------------------------------------------------
const DEMO_PROJECTS = {
  "add-bug": path.join(__dirname, "demo-projects", "add-bug")
};

// ---------------------------------------------------------------------------
// Report parser - extracts structured fields from the markdown report
// ---------------------------------------------------------------------------
function parseReport(raw) {
  const statusMatch = raw.match(/^Status:\s*(.+)$/m);
  const status = statusMatch ? statusMatch[1].trim() : "unknown";

  const diagnosisMatch = raw.match(/## Diagnosis\n([\s\S]*?)(?:\n##|$)/);
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : "Not available.";

  const validationSection = raw.match(/## Validation Evidence([\s\S]*?)(?:\n##|$)/);
  let validationStdout = "";
  let validationStderr = "";
  if (validationSection) {
    const vsText = validationSection[1];
    const stdoutMatch = vsText.match(/### stdout\n```text\n([\s\S]*?)```/);
    const stderrMatch = vsText.match(/### stderr\n```text\n([\s\S]*?)```/);
    validationStdout = stdoutMatch ? stdoutMatch[1] : "";
    validationStderr = stderrMatch ? stderrMatch[1] : "";
  }

  const retryMatch = raw.match(/Retry rounds used:\s*(\d+)/);
  const retryRounds = retryMatch ? Number(retryMatch[1]) : null;

  return {
    status,
    diagnosis,
    validationEvidence: { stdout: validationStdout, stderr: validationStderr },
    retryRounds,
    rawReport: raw
  };
}

// ---------------------------------------------------------------------------
// Run EEK CLI as a child process and capture stdout
// ---------------------------------------------------------------------------
function runEekCli({ projectPath, error, command, timeoutMs = 120_000 }) {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, "src", "eek-cli.mjs");

    const child = spawn(
      process.execPath,
      [cliPath, "--project", projectPath, "--error", error, "--command", command],
      { env: { ...process.env }, cwd: __dirname }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`EEK timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      // exit code 2 = "escalated" - still a valid result we can parse
      if (code !== null && code > 2) {
        reject(new Error(`EEK process exited with code ${code}. stderr: ${stderr}`));
      } else {
        resolve({ stdout, stderr, exitCode: code });
      }
    });

    child.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
const staticDir = existsSync(path.join(__dirname, "out")) ? path.join(__dirname, "out") : path.join(__dirname, "public");
export const CONCISE_CHAT_PROMPT = `You are a direct, senior software architect.
RULES:
1. Answer the user's prompt immediately without throat-clearing, greetings, or conversational filler.
2. Be concise, precise, and technical.
3. Keep the total response length under 300 words unless explicitly asked for an essay.
4. Use bullet points and code blocks for readability.`;

const SYSTEM_PROMPT = CONCISE_CHAT_PROMPT;


app.post("/api/chat", async (req, res) => {
  const rawPrompt = req.body?.prompt || req.body?.error || "";
  let formattedMessages = req.body?.messages;

  if (!Array.isArray(formattedMessages) || formattedMessages.length === 0) {
    if (!rawPrompt.trim()) {
      return res.status(400).json({ error: "Prompt or messages is required." });
    }
    formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawPrompt }
    ];
  } else {
    const hasSystem = formattedMessages.some((m) => m.role === "system");
    if (!hasSystem) {
      formattedMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...formattedMessages];
    }
  }

  // Model priority: request body → sanitized through model guard → env fallback
  const apiKey = process.env.OPENAI_API_KEY;
  const rawModel = req.body?.model;
  const model = sanitizeModel(rawModel);
  const maxTokens = parseInt(process.env.GPT_MAX_OUTPUT_TOKENS || "4096", 10);
  const endpoint = process.env.OPENAI_API_BASE ||
    (apiKey?.startsWith("nvapi-")
      ? "https://integrate.api.nvidia.com/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions");

  console.log(`[DEBUG-1] request_target: server.js /api/chat`);
  console.log(`[DEBUG-2] task_context:`, JSON.stringify({
    model_name: model,
    model_source: req.body?.model ? "request_body" : (process.env.NVIDIA_MODEL_NAME || process.env.GPT_MODEL) ? "env_var" : "fallback",
    maxTokens,
    messagesCount: formattedMessages.length,
    endpoint
  }));

  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    const responseText = await response.text();

    console.log(`[DEBUG-3] raw_response:`, JSON.stringify({ status: response.status, bodyLength: responseText.length }));

    if (!response.ok) {
      return res.status(response.status).json({ error: `API error (${response.status}): ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const answer = data?.choices?.[0]?.message?.content || "No answer generated.";

    console.log(`[DEBUG-4] parsed_response:`, JSON.stringify({ answerLength: answer.length, snippet: answer.slice(0, 100) }));

    return res.json({ answer, content: answer, reply: answer, model });
  } catch (err) {
    console.error("[/api/chat] Express route error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/diagnose", async (req, res) => {
  const error = req.body?.bugReport || req.body?.error;
  const command = req.body?.reproCommand || req.body?.command || "npm test";
  const projectKey = req.body?.projectKey || "add-bug";

  console.log(`[DEBUG-1] request_sent:`, JSON.stringify({
    source: "server.js /api/diagnose",
    projectKey,
    errorSnippet: error?.slice(0, 100),
    command,
    envModel: process.env.NVIDIA_MODEL_NAME || process.env.GPT_MODEL || "meta/llama-3.3-70b-instruct",
    hasApiKey: Boolean(process.env.OPENAI_API_KEY)
  }));

  if (!error) {
    return res.status(400).json({ error: "error / bugReport is required." });
  }

  const projectPath = req.body?.targetDir || DEMO_PROJECTS[projectKey] || path.join(__dirname, "demo-projects", "add-bug");

  if (!existsSync(projectPath)) {
    return res.status(500).json({ error: `Demo project path not found: ${projectPath}` });
  }

  try {
    console.log(`[eek] Starting diagnosis project="${projectKey}" command="${command}"`);
    const { stdout, stderr, exitCode } = await runEekCli({ projectPath, error, command });
    
    console.log(`[DEBUG-2] raw_response_received:`, JSON.stringify({
      exitCode,
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
      stdoutSnippet: stdout.slice(0, 300)
    }));

    const parsed = parseReport(stdout);

    console.log(`[DEBUG-3] parsed_response:`, JSON.stringify({
      status: parsed.status,
      diagnosisSnippet: parsed.diagnosis?.slice(0, 150),
      retryRounds: parsed.retryRounds
    }));

    console.log(`[DEBUG-4] ui_rendered_output (server dispatching):`, JSON.stringify({
      sendingStatus: parsed.status,
      diagnosisAvailable: Boolean(parsed.diagnosis)
    }));

    return res.json(parsed);
  } catch (err) {
    console.error("[eek] Fatal:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.use(express.static(staticDir));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EEK web demo listening on http://localhost:${PORT}`);
  console.log(`Demo projects: ${Object.keys(DEMO_PROJECTS).join(", ")}`);
});
