import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\31b4418b-215d-4584-8fcf-3bf2a860c4ec';
const outputPath = path.join(artifactDir, 'atlas_ai_home_screenshot.png');
const tmpUserDir = path.join(artifactDir, 'scratch', 'cdp_prof_' + Date.now());

fs.mkdirSync(tmpUserDir, { recursive: true });

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;

const proc = spawn(chromeExe, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${tmpUserDir}`,
  '--window-size=1600,1050',
  'http://localhost:3000/'
]);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (e) {}
  }
  throw new Error('Could not get CDP debug URL');
}

async function capture() {
  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Chrome CDP:', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve) => {
      ws.addEventListener('open', resolve);
    });

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const res = JSON.parse(event.data.toString());
          if (res.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // Wait 3.5 seconds for full React hydration and animations to settle
    console.log('Waiting 3.5s for React render...');
    await sleep(3500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot && shot.data) {
      const buffer = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      console.log(`SUCCESS: Screenshot written to ${outputPath} (${buffer.length} bytes)`);
    } else {
      console.error('Failed to capture screenshot data');
    }

    ws.close();
  } catch (err) {
    console.error('CDP Error:', err);
  } finally {
    proc.kill();
  }
}

capture();
