import { chromium } from '@playwright/test';

async function testUI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Opening http://localhost:5173...');
  await page.goto('http://localhost:5173');

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Take screenshot of homepage
  await page.screenshot({ path: 'homepage.png' });
  console.log('Screenshot saved: homepage.png');

  // Click "Start Practice" button to go to Exercise 1
  const startBtn = await page.locator('text=Start Practice').first();
  if (await startBtn.isVisible()) {
    console.log('✅ Start Practice button found');
    await startBtn.click();
    await page.waitForTimeout(2000);

    // Take screenshot of Exercise 1
    await page.screenshot({ path: 'exercise1-loaded.png' });
    console.log('Screenshot saved: exercise1-loaded.png');

    // Check question counter
    const questionHeader = await page.textContent('header').catch(() => '');
    console.log('Header text:', questionHeader);

    // Click settings button
    const settingsBtn = await page.locator('button').filter({ hasText: '⚙' }).first();
    if (await settingsBtn.isVisible()) {
      console.log('✅ Settings button found');
      await settingsBtn.click();
      await page.waitForTimeout(1000);

      // Take screenshot of settings panel
      await page.screenshot({ path: 'exercise1-settings.png' });
      console.log('Screenshot saved: exercise1-settings.png');

      // Check for instrument selector
      const pageText = await page.textContent('body');

      if (pageText.includes('Instrument Sound')) {
        console.log('✅ "Instrument Sound" text found in page!');

        // Check for radio buttons
        const pianoRadio = await page.locator('input[type="radio"][value="piano"]').count();
        const guitarRadio = await page.locator('input[type="radio"][value="guitar"]').count();

        console.log(`Piano radio buttons: ${pianoRadio}`);
        console.log(`Guitar radio buttons: ${guitarRadio}`);

        if (pianoRadio > 0 && guitarRadio > 0) {
          console.log('✅ Piano and Guitar radio buttons found!');

          // Check if piano is selected by default
          const pianoChecked = await page.locator('input[type="radio"][value="piano"]').first().isChecked();
          console.log(`Piano is ${pianoChecked ? 'checked' : 'not checked'} by default`);
        } else {
          console.log('❌ Radio buttons not found');
        }
      } else {
        console.log('❌ "Instrument Sound" NOT found in page');
        console.log('Settings panel content preview:', pageText.substring(0, 500));
      }
    } else {
      console.log('❌ Settings button not found');
    }
  } else {
    console.log('❌ Start Practice button not found');
  }

  await browser.close();
  console.log('\n✅ Test complete! Check the screenshots.');
}

testUI().catch(console.error);
