import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const { origin } = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${rootUrl}?${params.toString()}`);
}

