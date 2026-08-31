import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { encryptSecret, verifySessionToken } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { findUserById, updateUser } from "@/src/lib/userStore.mjs";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=no_code", request.url));
  }

  try {
    // 1. Swap temporary OAuth code for GitHub Access Token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[GitHub Callback Error]: Access token missing in exchange payload", tokenData);
      return NextResponse.redirect(new URL("/?auth_error=token_exchange_failed", request.url));
    }

    // 2. Link with logged-in user if session cookie is present
    const sessionCookie = request.cookies.get("atlas_session")?.value;
    if (sessionCookie) {
      const decodedSession = verifySessionToken(sessionCookie) as { userId: string } | null;
      if (decodedSession?.userId) {
        const encrypted = encryptSecret(accessToken);
        updateUser(decodedSession.userId, { encryptedGitHubToken: encrypted });
      }
    }

    // 3. Set cookie and redirect back to UI
    const response = NextResponse.redirect(new URL("/?github_status=connected", request.url));
    response.cookies.set("atlas_github_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("[GitHub Callback Error]:", {
      message: err?.message,
      stack: err?.stack,
      rawError: err,
    });
    return NextResponse.redirect(new URL("/?auth_error=server_error", request.url));
  }
}
