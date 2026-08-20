import puppeteer from 'puppeteer-core';
import path from 'path';
import { createSessionToken } from './src/lib/authCrypto.mjs';

const artifactDir = 'C:\\Users\\AMBER\\.gemini\\antigravity-ide\\brain\\97acb2bb-d432-4899-bacd-f462e18b6a29';
const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting Perfect UI Flow Test...');
  const browser = await puppeteer.launch({
    executablePath: chromeExe,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  // 1. Generate valid session token and set cookie
  const sessionToken = createSessionToken({
    userId: '4367d9c0-2202-4e98-bfc5-ed43c10a1b5d',
    email: 'amberagey65@gmail.com'
  });

  await page.setCookie({
    name: 'atlas_session',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax'
  });

  console.log('🌐 Opening http://localhost:3000/ with authenticated session...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  // 2. Capture Home UI (Dark Mode)
  console.log('📸 Step 1: Capturing Home UI Screen (Dark Mode)...');
  const darkPath1 = path.join(artifactDir, '1_home_ui_dark_mode.png');
  await page.screenshot({ path: darkPath1, fullPage: false });
  console.log(`✅ Dark Mode Home UI saved to: ${darkPath1}`);

  // 3. Turn ON Light Mode
  console.log('☀️ Step 2: Turning ON Light Mode...');
  const toggleBtn = await page.$('button[aria-label="Toggle theme"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await sleep(1500);
  }

  // 4. Capture Home UI (Light Mode)
  console.log('📸 Step 3: Capturing Home UI Screen (Light Mode)...');
  const lightPath = path.join(artifactDir, '2_home_ui_light_mode.png');
  await page.screenshot({ path: lightPath, fullPage: false });
  console.log(`✅ Light Mode Home UI saved to: ${lightPath}`);

  // 5. Wait 30 seconds
  console.log('⏳ Step 4: Waiting 30 seconds in Light Mode...');
  for (let s = 30; s > 0; s -= 5) {
    console.log(`⏱️ ${s} seconds remaining...`);
    await sleep(5000);
  }
  console.log('✨ 30 seconds completed!');

  // 6. Turn ON Dark Mode again
  console.log('🌙 Step 5: Turning Dark Mode back ON...');
  const toggleBtn2 = await page.$('button[aria-label="Toggle theme"]');
  if (toggleBtn2) {
    await toggleBtn2.click();
    await sleep(1500);
  }

  // 7. Capture Home UI (Dark Mode Restored)
  console.log('📸 Step 6: Capturing Home UI Screen (Dark Mode Restored)...');
  const darkPath2 = path.join(artifactDir, '3_home_ui_dark_mode_restored.png');
  await page.screenshot({ path: darkPath2, fullPage: false });
  console.log(`✅ Restored Dark Mode Home UI saved to: ${darkPath2}`);

  await browser.close();
  console.log('🎉 Full live preview test successfully completed!');
}

main().catch(err => {
  console.error('❌ Error during test:', err);
  process.exit(1);
});
