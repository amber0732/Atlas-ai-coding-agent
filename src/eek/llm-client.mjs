export function createLlmClient({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.GPT_MODEL || process.env.OPENAI_MODEL,
  endpoint = process.env.OPENAI_API_BASE || (process.env.OPENAI_API_KEY?.startsWith("nvapi-") ? "https://integrate.api.nvidia.com/v1/chat/completions" : "https://api.openai.com/v1/chat/completions")
} = {}) {
  return {
    configured: Boolean(apiKey && model),
    async complete({ instructions, input, maxOutputTokens = 1600 }) {
      if (apiKey && model) {
        try {
          const payload = {
            model,
            messages: [
              { role: "system", content: instructions },
              { role: "user", content: input }
            ],
            max_tokens: maxOutputTokens
          };

          console.log(`[DEBUG-1] request_sent:`, JSON.stringify({
            endpoint,
            model,
            instructionsLength: instructions?.length,
            inputLength: input?.length,
            maxOutputTokens
          }));

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const text = await response.text();

          console.log(`[DEBUG-2] raw_response_received:`, JSON.stringify({
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            bodyLength: text.length,
            bodySnippet: text.slice(0, 300)
          }));

          if (response.ok) {
            const parsedPayload = JSON.parse(text);
            const content = extractText(parsedPayload);
            if (content) {
              console.log(`[DEBUG-3] parsed_response:`, JSON.stringify({
                contentLength: content.length,
                contentSnippet: content.slice(0, 200)
              }));
              return content;
            }
            throw new Error("Empty content received from LLM completion.");
          } else {
            console.error(`[llm-client] Remote API responded with status ${response.status}: ${text}`);
            throw new Error(`Remote API responded with status ${response.status}: ${text}`);
          }
        } catch (err) {
          console.error("[llm-client] Remote API call failed:", err.message);
          throw err;
        }
      } else {
        const errorMsg = `API Key or Model missing. apiKey configured: ${Boolean(apiKey)}, model configured: ${Boolean(model)}`;
        console.error("[llm-client]", errorMsg);
        throw new Error(errorMsg);
      }
    }
  };
}

function extractText(payload) {
  return payload?.choices?.[0]?.message?.content || "";
}

function redact(value) {
  return String(value)
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "sk-[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");
}

