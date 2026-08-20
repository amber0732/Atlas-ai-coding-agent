import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { listUserRepos, createRepo, commitFile, createPullRequest } from '@/src/tools/githubTools.mjs';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('atlas_github_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Please connect GitHub first.' }, { status: 401 });
  }

  try {
    const { action, params } = await request.json();

    switch (action) {
      case 'list_repos': {
        const repos = await listUserRepos(token);
        return NextResponse.json({ success: true, data: repos });
      }
      case 'create_repo': {
        const result = await createRepo(token, params);
        return NextResponse.json({ success: true, data: result });
      }
      case 'commit_file': {
        const result = await commitFile(token, params);
        return NextResponse.json({ success: true, data: result });
      }
      case 'create_pr': {
        const result = await createPullRequest(token, params);
        return NextResponse.json({ success: true, data: result });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'GitHub execution failed' }, { status: 500 });
  }
}
