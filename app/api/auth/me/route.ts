import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { verifySessionToken } from '@/src/lib/authCrypto.mjs';
// @ts-ignore
import { findUserById } from '@/src/lib/userStore.mjs';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('atlas_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = verifySessionToken(sessionToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasGitHub: !!user.encryptedGitHubToken,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
