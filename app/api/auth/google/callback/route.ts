import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// @ts-ignore
import { createSessionToken } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { findUserByEmail, createUser } from "@/src/lib/userStore.mjs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=google_no_code", request.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const { origin } = new URL(request.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    // 1. Swap auth code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[Google Auth Error]: No access token returned", tokenData);
      return NextResponse.redirect(new URL("/?auth_error=google_token_failed", request.url));
    }

    // 2. Fetch Google profile info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/?auth_error=google_userinfo_failed", request.url));
    }

    const profile = await userRes.json();

    if (!profile?.email) {
      return NextResponse.redirect(new URL("/?auth_error=google_no_email", request.url));
    }

    // 3. Find or create user in userStore
    let user = findUserByEmail(profile.email);
    if (!user) {
      user = createUser({
        id: crypto.randomUUID(),
        name: profile.name || profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        passwordHash: null, // OAuth-managed account
        avatarUrl: profile.picture || null,
        encryptedGitHubToken: null,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Create session and set cookie
    const sessionToken = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
    const response = NextResponse.redirect(new URL("/", request.url));
    
    response.cookies.set("atlas_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error("[Google Auth Callback Error]:", err);
    return NextResponse.redirect(new URL("/?auth_error=google_failed", request.url));
  }
}
