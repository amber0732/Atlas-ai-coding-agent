import { NextResponse } from "next/server";

export async function GET() {
  const rootUrl = "https://github.com/login/oauth/authorize";
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: "repo read:user user:email", // Grants permissions to manage repos and commits
  });

  return NextResponse.redirect(`${rootUrl}?${params.toString()}`);
}
