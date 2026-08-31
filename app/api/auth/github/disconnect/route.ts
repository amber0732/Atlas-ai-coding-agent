import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { verifySessionToken } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { updateUser } from "@/src/lib/userStore.mjs";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Unlink token from user record in database
    const sessionCookie = request.cookies.get("atlas_session")?.value;
    if (sessionCookie) {
      const decoded = verifySessionToken(sessionCookie) as { userId: string } | null;
      if (decoded?.userId) {
        updateUser(decoded.userId, { encryptedGitHubToken: null });
      }
    }

    // 2. Prepare response and delete GitHub cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "GitHub account unlinked successfully.",
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    response.cookies.set("atlas_github_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const bodyText = err?.message || "Failed to disconnect GitHub";
    console.error("[GitHub Disconnect Error]:", {
      statusCode,
      bodyText,
      stack: err?.stack,
      rawError: err,
    });
    return NextResponse.json(
      { error: bodyText, statusCode },
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }
}
