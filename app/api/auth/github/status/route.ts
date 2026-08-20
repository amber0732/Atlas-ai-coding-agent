import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { verifySessionToken, decryptSecret } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { findUserById } from "@/src/lib/userStore.mjs";

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
    return NextResponse.json({ connected: false });
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Atlas-AI-App",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ connected: false });
    }

    const data = await userRes.json();
    return NextResponse.json({
      connected: true,
      username: data.login,
      avatarUrl: data.avatar_url,
      profileUrl: data.html_url,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
