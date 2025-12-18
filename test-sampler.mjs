import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing Tone.Sampler audio issue...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();

  // Listen to console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log(`📝 Console: ${text}`);
  });

  // Listen to errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });

  try {
    console.log('🌐 Opening http://localhost:5174...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });

    console.log('✅ Page loaded\n');

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Test Exercise 1 - Piano
    console.log('🎹 Testing Exercise 1 (Piano)...');
    const ex1Link = await page.$('a[href="/exercise1"]');
    if (ex1Link) {
      await ex1Link.click();
      await page.waitForTimeout(3000);

      // Try to play a note
      console.log('🎵 Clicking "Play C" button...');
      const playCButton = await page.$('button:has-text("Play C")');
      if (playCButton) {
        await playCButton.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️  Could not find Play C button');
      }

      // Try clicking a note button
      const noteButtons = await page.$$('.note-button');
      if (noteButtons.length > 0) {
        console.log('🎵 Clicking first note button...');
        await noteButtons[0].click();
        await page.waitForTimeout(2000);
      }
    }

    // Test Exercise 2 - Guitar
    console.log('\n🎸 Testing Exercise 2 (Guitar)...');
    await page.goto('http://localhost:5174/exercise2', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);

    // Try to play melody
    const playButton = await page.$('button:has-text("Play Melody")');
    if (playButton) {
      console.log('🎵 Clicking "Play Melody" button...');
      await playButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️  Could not find Play Melody button');
    }

    // Check console for loading messages
    console.log('\n📊 Summary:');
    const samplerLoaded = consoleMessages.some(msg => msg.includes('samples loaded successfully'));
    const samplerError = consoleMessages.some(msg => msg.includes('Error loading samples') || msg.includes('Error creating sampler'));

    if (samplerLoaded) {
      console.log('✅ Sampler loaded successfully!');
    } else if (samplerError) {
      console.log('❌ Sampler failed to load - check errors above');
    } else {
      console.log('⚠️  No sampler loading messages found - might not be initialized');
    }

    console.log('\n⏸️  Pausing for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
    console.log('\n✅ Test complete');
  }
})();
