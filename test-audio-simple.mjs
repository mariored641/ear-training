import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing Audio...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    devtools: true // Open DevTools automatically
  });

  try {
    const page = await browser.newPage();

    // Collect console messages
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
      console.log(`${prefix} ${text}`);
    });

    // Collect errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    console.log('🌐 Opening Exercise 1...');
    await page.goto('http://localhost:5174/exercise1', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('✅ Page loaded\n');
    console.log('⏳ Waiting 5 seconds for React and audio initialization...\n');
    await page.waitForTimeout(5000);

    console.log('\n🎵 Attempting to click first note button...\n');

    // Try to find and click a note button
    const noteButton = await page.$('.note-button');
    if (noteButton) {
      console.log('✅ Found note button, clicking...\n');
      await noteButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('❌ Could not find note button\n');
    }

    console.log('\n⏸️  Keeping browser open for 30 seconds for manual testing...\n');
    console.log('   Check the DevTools console for any errors!\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  } finally {
    await browser.close();
    console.log('\n✅ Done');
  }
})();
