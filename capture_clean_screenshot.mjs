import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\31b4418b-215d-4584-8fcf-3bf2a860c4ec';
const outputPath = path.join(artifactDir, 'atlas_ai_home_screenshot.png');
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromeExe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050 });
  
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait extra 1 second for animations
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`SUCCESS: Screenshot captured to ${outputPath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
