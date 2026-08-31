import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const isDev = process.env.NODE_ENV === 'development';
  const canonicalDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-ai-coding-agent-ten.vercel.app';
  const baseUrl = isDev ? 'http://localhost:3000' : canonicalDomain;

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    const errorMsg = 'GITHUB_CLIENT_ID is not configured in server environment.';
    console.error(`[GitHub Auth Error]: Status: 500, Message: ${errorMsg}`);
    return NextResponse.json(
      { error: errorMsg, statusCode: 500 },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const redirectUri = `${baseUrl}/api/auth/github/callback`;
  const scope = 'repo read:user user:email';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
