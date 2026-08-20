// src/tools/searchTools.mjs
import { tavily } from "@tavily/core";

export async function searchRealtimeWeb(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured in .env.local");
  }

  const tvly = tavily({ apiKey });

  const response = await tvly.search(query, {
    searchDepth: "basic",
    maxResults: 5,
    includeAnswer: true,
  });

  return {
    directAnswer: response.answer || null,
    results: (response.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
  };
}
