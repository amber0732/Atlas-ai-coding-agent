// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
  response.cookies.delete('atlas_session');
  response.cookies.delete('atlas_github_token');
  return response;
}
