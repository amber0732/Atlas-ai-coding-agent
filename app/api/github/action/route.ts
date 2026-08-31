import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { listUserRepos, createRepo, commitFile, createPullRequest } from '@/src/tools/githubTools.mjs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('atlas_github_token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: Please connect GitHub first.' },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, params } = await request.json();

    switch (action) {
      case 'list_repos': {
        const repos = await listUserRepos(token);
        return NextResponse.json(
          { success: true, data: repos },
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      case 'create_repo': {
        const result = await createRepo(token, params);
        return NextResponse.json(
          { success: true, data: result },
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      case 'commit_file': {
        const result = await commitFile(token, params);
        return NextResponse.json(
          { success: true, data: result },
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      case 'create_pr': {
        const result = await createPullRequest(token, params);
        return NextResponse.json(
          { success: true, data: result },
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (err: any) {
    const statusCode = err?.status || err?.statusCode || 500;
    const bodyText = err?.message || 'GitHub execution failed';
    console.error('[GitHub Action Error]:', {
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
