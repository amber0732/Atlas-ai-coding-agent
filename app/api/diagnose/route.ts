import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bugReport, reproCommand, targetDir } = body || {};

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = (event: string, data: any) => {
      return writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    };

    const projectPath = targetDir || path.join(process.cwd(), "demo-projects", "add-bug");

    const args = ['src/eek-cli.mjs', '--json'];
    if (bugReport) args.push('--error', bugReport);
    if (reproCommand) args.push('--command', reproCommand);
    if (projectPath) args.push('--project', projectPath);

    const eekProcess = spawn('node', args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BUG_REPORT: bugReport || "",
        REPRO_CMD: reproCommand || ""
      },
    });

    eekProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (!line.trim()) return;
          try {
            const logEntry = JSON.parse(line);
            sendEvent(logEntry.type || 'log', logEntry);
          } catch {
            sendEvent('raw_log', { message: line });
          }
        });
      } catch (e: any) {
        sendEvent('raw_log', { message: data.toString() });
      }
    });

    eekProcess.stderr.on('data', (data) => {
      sendEvent('error', { message: data.toString() });
    });

    eekProcess.on('close', (code) => {
      sendEvent('complete', { exitCode: code });
      writer.close();
    });

    eekProcess.on('error', (err) => {
      sendEvent('error', { message: err.message });
      writer.close();
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
