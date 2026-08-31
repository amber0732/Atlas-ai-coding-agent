import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Determine canonical base URL
  const isDev = process.env.NODE_ENV === "development";
  const canonicalDomain = process.env.NEXT_PUBLIC_APP_URL || "https://atlas-ai-coding-agent-ten.vercel.app";

  const baseUrl = isDev ? "http://localhost:3000" : canonicalDomain;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const errorMsg = "GOOGLE_CLIENT_ID is not configured in server environment.";
    console.error(`[Google Login Error]: Status: 500, Message: ${errorMsg}`);
    return NextResponse.json(
      { error: errorMsg, statusCode: 500 },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Strict, fixed callback URI
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // 3. Construct Google OAuth Authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
