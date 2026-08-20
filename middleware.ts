// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("atlas_session")?.value;
  const { pathname } = request.nextUrl;

  // 1. Protect the chat API from unauthenticated calls
  if (pathname.startsWith("/api/chat") && !sessionToken) {
    return NextResponse.json(
      { error: "Unauthorized: You must create an account or sign in to use Atlas AI." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat/:path*"],
};
