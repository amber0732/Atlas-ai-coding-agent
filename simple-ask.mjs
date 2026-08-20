// simple-ask.mjs
// A general-purpose AI question-asker, separate from EEK's bug-diagnosis pipeline.
// Uses the same .env config (OPENAI_API_KEY, GPT_MODEL) that your EEK project already has.
//
// SETUP:
// 1. Copy this file into your gpt-eos-agent project folder (same level as src/).
// 2. Make sure "dotenv" is already installed (it is, since EEK uses it).
// 3. Your existing .env already has:
//      OPENAI_API_KEY=nvapi-...
//      GPT_MODEL=z-ai/glm-5.2
//    No changes needed there.
//
// USAGE:
//   node simple-ask.mjs "How do I write a good system prompt for an agent?"
//   node simple-ask.mjs "Explain what a race condition is, with an example."
//
// You can ask this ANYTHING — coding help, prompting technique questions,
// explanations of errors, LLM concepts, architecture advice, etc.
// It does NOT touch your files or run any commands — it just answers.

import 'dotenv/config';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

async function ask(question) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.GPT_MODEL || 'z-ai/glm-5.2';

  if (!apiKey) {
    console.error('❌ No API key found. Make sure .env has OPENAI_API_KEY set.');
    process.exit(1);
  }

  console.log(`\n🤖 Asking ${model}...\n`);

  let response;
  try {
    response = await fetch(NVIDIA_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a direct, senior software architect. Answer immediately without conversational filler. Be concise, precise, and technical. Keep under 300 words unless requested otherwise. Use bullet points and code blocks for readability.',
          },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
  } catch (err) {
    console.error('❌ Network error reaching the API:', err.message);
    process.exit(1);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ API error (status ${response.status}):\n${errText}`);
    process.exit(1);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;

  if (!answer) {
    console.error('❌ No answer returned. Raw response:\n', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(answer);
  console.log('');
}

// --- Entry point ---
const question = process.argv.slice(2).join(' ').trim();

if (!question) {
  console.log('Usage: node simple-ask.mjs "your question here"');
  process.exit(1);
}

ask(question);
