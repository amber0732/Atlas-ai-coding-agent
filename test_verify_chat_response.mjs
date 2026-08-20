import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\31b4418b-215d-4584-8fcf-3bf2a860c4ec';
const outputPath = path.join(artifactDir, 'atlas_ai_chat_response_bubble_screenshot.png');
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromeExe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050 });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });

  await page.click('textarea');
  await page.type('textarea', 'hi AI');
  await page.keyboard.press('Enter');

  // Wait until the fullscreen thinking overlay is closed (no longer in DOM or hidden)
  console.log('Waiting for response...');
  await page.waitForFunction(() => {
    // Check if chat bubble exists
    const bubbles = document.querySelectorAll('.max-w-5xl div');
    return bubbles.length > 0 && !document.querySelector('[aria-label="Atlas AI Inference Engine"]');
  }, { timeout: 30000 });

  console.log('Response received and rendered!');
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`SUCCESS: Screenshot with conversation response saved to ${outputPath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
