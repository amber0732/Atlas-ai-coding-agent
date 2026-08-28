import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { runEEKOrchestrator } from "@/src/eek/orchestrator.mjs";

export async function POST(request: NextRequest) {
  try {
    // 0. Session Auth Guard
    const sessionToken = request.cookies.get("atlas_session")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized: You must create an account or sign in to use Atlas AI." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const prompt = body?.prompt || body?.error || "";

    // 1. Resolve model name with proper environment variable fallback
    const modelName =
      process.env.NVIDIA_MODEL_NAME ||
      process.env.NEXT_PUBLIC_DEFAULT_MODEL ||
      process.env.GPT_MODEL ||
      "meta/llama-3.3-70b-instruct";

    // 2. Prevent client-side stale cached model strings from overriding
    const selectedModel =
      body?.model && !body.model.includes("8b-instruct")
        ? body.model
        : modelName;

    // Debug log (Check this in Vercel Logs or local terminal)
    console.log(`[LLM Call] Executing request with model: ${selectedModel}`);

    // 1. Extract the authenticated GitHub token from incoming request cookies
    const githubToken = request.cookies.get("atlas_github_token")?.value || null;

    // 2. Pass prompt + githubToken into the agent kernel
    const response = await runEEKOrchestrator({
      prompt,
      model: selectedModel,
      githubToken,
    });

    const answer =
      typeof response === "object" && response !== null && "output" in response
        ? (response as any).output
        : response;

    return NextResponse.json({
      answer,
      content: answer,
      reply: answer,
      model: selectedModel,
    });
  } catch (error: any) {
    console.error("[Chat Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process query" },
      { status: 500 }
    );
  }
}
