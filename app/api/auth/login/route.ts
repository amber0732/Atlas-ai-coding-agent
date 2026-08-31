// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { verifyPassword, createSessionToken } from '@/src/lib/authCrypto.mjs';
// @ts-ignore
import { findUserByEmail } from '@/src/lib/userStore.mjs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, name: user.name, email: user.email, hasGitHub: !!user.encryptedGitHubToken },
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

    response.cookies.set('atlas_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const bodyText = err?.message || 'Login failed';
    console.error('[Auth Login Error]:', {
      statusCode,
      bodyText,
      stack: err?.stack,
      rawError: err,
    });
    return NextResponse.json(
      { error: bodyText, statusCode },
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
