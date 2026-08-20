import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "custom-gpt-instructions.md",
  "prompts/eos-v2.md",
  "agent.config.json",
  "src/index.mjs",
  "README.md"
];

for (const file of requiredFiles) {
  const content = await readFile(path.join(root, file), "utf8");
  if (!content.trim()) {
    throw new Error(`${file} is empty`);
  }
}

const prompt = await readFile(path.join(root, "prompts/eos-v2.md"), "utf8");
for (const phrase of [
  "EOS v1.0",
  "Token Discipline",
  "Confidence",
  "Playbook Selection",
  "Tool and Code Safety"
]) {
  if (!prompt.includes(phrase)) {
    throw new Error(`Prompt missing expected phrase: ${phrase}`);
  }
}

const { stdout } = await execFileP("node", [
  path.join(root, "src", "index.mjs"),
  "--dry-run",
  "TypeScript error: property id does not exist on type User"
]);

if (!stdout.includes("GPT dry run OK")) {
  throw new Error("Dry run did not complete successfully");
}

console.log("Smoke test passed.");

