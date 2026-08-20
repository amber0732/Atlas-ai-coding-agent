import { NextResponse } from "next/server";

export async function GET() {
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`${rootUrl}?${params.toString()}`);
}
