import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { verifySessionToken, decryptSecret } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { findUserById } from "@/src/lib/userStore.mjs";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let token = request.cookies.get("atlas_github_token")?.value;

  // Fallback: Restore from encrypted DB record if session exists
  if (!token) {
    const sessionCookie = request.cookies.get("atlas_session")?.value;
    if (sessionCookie) {
      const decoded = verifySessionToken(sessionCookie) as { userId: string } | null;
      if (decoded?.userId) {
        const user = findUserById(decoded.userId);
        if (user?.encryptedGitHubToken) {
          token = decryptSecret(user.encryptedGitHubToken) || undefined;
        }
      }
    }
  }

  if (!token) {
    return NextResponse.json(
      { connected: false },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Atlas-AI-App",
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.warn(`[GitHub Status Check] Non-OK response [HTTP ${userRes.status}]: ${errText}`);
      return NextResponse.json(
        { connected: false },
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await userRes.json();
    return NextResponse.json(
      {
        connected: true,
        username: data.login,
        avatarUrl: data.avatar_url,
        profileUrl: data.html_url,
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[GitHub Status Error]:", {
      message: err?.message,
      stack: err?.stack,
      rawError: err,
    });
    return NextResponse.json(
      { connected: false },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
