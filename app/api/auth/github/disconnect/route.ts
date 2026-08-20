import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { verifySessionToken } from "@/src/lib/authCrypto.mjs";
// @ts-ignore
import { updateUser } from "@/src/lib/userStore.mjs";

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
    const response = NextResponse.json({
      success: true,
      message: "GitHub account unlinked successfully.",
    });

    response.cookies.set("atlas_github_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to disconnect GitHub" },
      { status: 500 }
    );
  }
}
