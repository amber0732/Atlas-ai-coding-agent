import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { verifySessionToken } from '@/src/lib/authCrypto.mjs';
// @ts-ignore
import { findUserById } from '@/src/lib/userStore.mjs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('atlas_session')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = verifySessionToken(sessionToken) as any;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let user = findUserById(payload.userId);
    if (!user) {
      user = {
        id: payload.userId,
        name: payload.name || payload.email?.split('@')[0] || 'User',
        email: payload.email,
        encryptedGitHubToken: null,
        createdAt: payload.createdAt || new Date().toISOString(),
      };
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          hasGitHub: !!user.encryptedGitHubToken,
          createdAt: user.createdAt,
        },
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const bodyText = err?.message || 'Authentication check failed';
    console.error('[Auth Me Error]:', {
      statusCode,
      bodyText,
      stack: err?.stack,
      rawError: err,
    });
    return NextResponse.json(
      { authenticated: false, user: null, error: bodyText, statusCode },
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
