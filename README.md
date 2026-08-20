# ATLAS AI CODING AGENT

This folder contains your first **AI** engineering agent, powered by the EOS v1.0 instruction system.

It now also includes **Engineering Execution Kernel v1.0 (EEK)**, a real error diagnosis and repair pipeline. EEK runs a supplied reproduction command, captures its output, asks independent specialists for repair candidates, validates candidates against the real project, and reports only grounded results.

It gives you two usable outputs:

1. `custom-gpt-instructions.md` - paste this into the Custom GPT builder.
2. `src/index.mjs` - a small local command-line agent that sends project errors to the OpenAI Responses API with the EOS prompt.

The local CLI is dependency-free and uses Node.js built-in `fetch`.

## Files

- `custom-gpt-instructions.md` - full pasteable Custom GPT instruction file.
- `prompts/eos-v2.md` - compact system prompt used by the CLI.
- `agent.config.json` - agent metadata and behavior policy.
- `src/index.mjs` - local GPT agent runner.
- `examples/error-report.md` - sample error report.
- `tests/smoke-test.mjs` - verifies the package structure and dry-run behavior.
- `src/eek-cli.mjs` - EEK v3.0 command-line entry point.
- `src/eek/` - triage, evidence, model calls, validation, arbitration, and reporting modules.
- `docs/eek-v3/README.md` - v3.0 implementation map and operating rules.

## Setup

Use Node.js 18 or newer.

PowerShell example:

```powershell
cd C:\Users\AMBER\Documents\Codex\2026-07-16\chrome-plugin-chrome-openai-bundled-file\outputs\gpt-eos-agent
$env:OPENAI_API_KEY="your_api_key_here"
$env:GPT_MODEL="gpt-4.1"
```

You can choose a different model available in your OpenAI account by changing `GPT_MODEL`.

## Run a Dry Test

This does not call the API:

```powershell
npm test
```

## Run EEK v3.0

Collect real evidence without calling a model:

```powershell
npm run eek -- --dry-run --error "The test is failing" --command "npm test"
```

Run diagnosis and candidate validation:

```powershell
npm run eek -- --error "The test is failing" --command "npm test"
```

To keep a selected change, use `--apply`. The agent validates it once during comparison and once more before leaving it in the project. Without `--apply`, candidate changes are rolled back after validation.

Or:

```powershell
node src/index.mjs --dry-run "TypeScript says property id does not exist on type User"
```

## Analyze an Error

```powershell
node src/index.mjs "Paste your error or problem here"
```

From a file:

```powershell
node src/index.mjs --file .\examples\error-report.md
```

With limited project context:

```powershell
node src/index.mjs --project C:\path\to\your\project --file .\examples\error-report.md
```

The CLI reads a small, safe subset of project files and skips common build folders, `.env` files, and secret-looking content.

## Token Control

The prompt is designed for concise answers. You can also control output size:

```powershell
$env:GPT_MAX_OUTPUT_TOKENS="900"
```

## Custom GPT Builder

To create the Custom GPT:

1. Open GPT Builder.
2. Name it `GPT`.
3. Description: `Engineering agent for debugging, architecture, code review, validation, and production readiness.`
4. Paste `custom-gpt-instructions.md` into the Instructions field.
5. Enable tools only if you want them: code execution, web browsing, file search, or connectors.
6. Upload project-specific docs as knowledge files when needed.

## Safety Boundaries

The agent is intentionally strict:

- It should inspect before editing.
- It should verify after changes.
- It should not claim hidden helper agents exist.
- It should not expose secrets.
- It should not do destructive actions without confirmation.

## API Note

The CLI calls the OpenAI Responses API endpoint `https://api.openai.com/v1/responses` with `model`, `instructions`, and `input`.
