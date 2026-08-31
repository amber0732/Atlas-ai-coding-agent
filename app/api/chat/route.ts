import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { runEEKOrchestrator } from "@/src/eek/orchestrator.mjs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 0. Session Auth Guard
    const sessionToken = request.cookies.get("atlas_session")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized: You must create an account or sign in to use Atlas AI." },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 1. API Key validation guard (NVIDIA_API_KEY)
    const apiKey = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const errorMsg = "Unauthorized: NVIDIA_API_KEY is missing in server environment variables.";
      console.error(`[Chat Route Auth Error] HTTP 401: ${errorMsg}`);
      return NextResponse.json(
        { error: errorMsg, statusCode: 401 },
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await request.json();
    const prompt = body?.prompt || body?.error || "";

    // 2. Resolve model name with proper environment variable fallback
    const modelName =
      process.env.NVIDIA_MODEL_NAME ||
      process.env.NEXT_PUBLIC_DEFAULT_MODEL ||
      process.env.GPT_MODEL ||
      "meta/llama-3.3-70b-instruct";

    // 3. Prevent client-side stale cached model strings from overriding
    const selectedModel =
      body?.model && !body.model.includes("8b-instruct")
        ? body.model
        : modelName;

    // Debug log (Check this in Vercel Logs or local terminal)
    console.log(`[LLM Call] Executing request with model: ${selectedModel}`);

    // 4. Extract the authenticated GitHub token from incoming request cookies
    const githubToken = request.cookies.get("atlas_github_token")?.value || null;

    // 5. Pass prompt + githubToken into the agent kernel
    const response = await runEEKOrchestrator({
      prompt,
      model: selectedModel,
      githubToken,
    });

    const answer =
      typeof response === "object" && response !== null && "output" in response
        ? (response as any).output
        : response;

    return NextResponse.json(
      {
        answer,
        content: answer,
        reply: answer,
        model: selectedModel,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error: any) {
    const statusCode = error?.status || error?.statusCode || 500;
    const bodyText = error?.message || "Failed to process query";
    console.error("[Chat Route Error]:", {
      statusCode,
      bodyText,
      stack: error?.stack,
      rawError: error,
    });
    return NextResponse.json(
      { error: bodyText, statusCode },
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
