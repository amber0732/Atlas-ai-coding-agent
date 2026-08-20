import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const possiblePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const browserExe = possiblePaths.find(p => fs.existsSync(p)) || 'chrome';
const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\31b4418b-215d-4584-8fcf-3bf2a860c4ec';
const outputPath = path.join(artifactDir, 'atlas_ai_home_screenshot.png');
const tmpUserDir = path.join(artifactDir, 'scratch', 'chrome_prof_' + Date.now());

fs.mkdirSync(tmpUserDir, { recursive: true });

const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--user-data-dir=${tmpUserDir}`,
  '--window-size=1600,1050',
  `--screenshot=${outputPath}`,
  'http://localhost:3000/'
];

const proc = spawn(browserExe, args, { stdio: 'inherit' });

proc.on('close', (code) => {
  console.log(`Browser process exited with code ${code}`);
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`SUCCESS: Screenshot saved (${stats.size} bytes) at ${outputPath}`);
  }
});
