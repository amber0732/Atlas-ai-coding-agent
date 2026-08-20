// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { verifyPassword, createSessionToken } from '@/src/lib/authCrypto.mjs';
// @ts-ignore
import { findUserByEmail } from '@/src/lib/userStore.mjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = createSessionToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, hasGitHub: !!user.encryptedGitHubToken },
    });

    response.cookies.set('atlas_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
