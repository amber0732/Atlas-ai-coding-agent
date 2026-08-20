// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// @ts-ignore
import { hashPassword, createSessionToken } from '@/src/lib/authCrypto.mjs';
// @ts-ignore
import { findUserByEmail, createUser } from '@/src/lib/userStore.mjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Email and password (min 6 characters) are required.' },
        { status: 400 }
      );
    }

    if (findUserByEmail(email)) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    const newUser = {
      id: userId,
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      encryptedGitHubToken: null,
      createdAt: new Date().toISOString(),
    };

    createUser(newUser);

    const token = createSessionToken({ userId: newUser.id, email: newUser.email });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });

    response.cookies.set('atlas_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
