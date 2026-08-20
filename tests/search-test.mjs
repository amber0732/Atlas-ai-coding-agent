import assert from "node:assert/strict";
import { searchRealtimeWeb } from "../src/tools/searchTools.mjs";

console.log("Running Search Tools Test Suite...");

// 1. Missing API Key should throw clean error
const originalKey = process.env.TAVILY_API_KEY;
delete process.env.TAVILY_API_KEY;

await assert.rejects(
  async () => {
    await searchRealtimeWeb("latest AI developments");
  },
  {
    message: "TAVILY_API_KEY is not configured in .env.local"
  },
  "searchRealtimeWeb should reject when TAVILY_API_KEY is absent"
);

// Restore key if it was set
if (originalKey) {
  process.env.TAVILY_API_KEY = originalKey;
}

console.log("Search tools test passed successfully!");
