export function createLlmClient({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.GPT_MODEL || process.env.OPENAI_MODEL,
  endpoint = "https://api.openai.com/v1/responses"
} = {}) {
  return {
    configured: Boolean(apiKey && model),
    async complete({ instructions, input, maxOutputTokens = 1600 }) {
      if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
      if (!model) throw new Error("Missing GPT_MODEL or OPENAI_MODEL.");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model, instructions, input, max_output_tokens: maxOutputTokens })
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`LLM request failed with ${response.status}: ${redact(text)}`);

      const payload = JSON.parse(text);
      return extractText(payload);
    }
  };
}

function extractText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function redact(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");
}
