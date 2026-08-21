import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 1. Determine canonical base URL
  const isDev = process.env.NODE_ENV === 'development';
  const canonicalDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-ai-coding-agent-ten.vercel.app';
  
  const baseUrl = isDev ? 'http://localhost:3000' : canonicalDomain;
  
  // 2. Strict, fixed callback URI
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // 3. Construct Google OAuth Authorization URL
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
