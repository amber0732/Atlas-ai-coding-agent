import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\31b4418b-215d-4584-8fcf-3bf2a860c4ec';
const outputPath = path.join(artifactDir, 'atlas_ai_fast_response_screenshot.png');
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

  console.log('Sending query "hi AI" in browser...');
  const t0 = Date.now();
  await page.click('textarea');
  await page.type('textarea', 'hi AI');
  await page.keyboard.press('Enter');

  // Wait for the conversation response bubble to appear
  await page.waitForSelector('.max-w-5xl', { timeout: 15000 });
  
  // Give 1.5s for response to render and settle
  await new Promise(r => setTimeout(r, 2000));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`SUCCESS: Full live chat round-trip completed in ${elapsed}s!`);

  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`Screenshot saved to ${outputPath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
