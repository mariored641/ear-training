import { chromium } from '@playwright/test';

async function testInstrument() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('\n=== Testing Instrument Selector ===\n');

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Start Exercise 1
  await page.locator('text=Start Practice').first().click();
  await page.waitForTimeout(2000);

  // Open settings
  await page.locator('button').filter({ hasText: '⚙' }).first().click();
  await page.waitForTimeout(1000);

  // Scroll to bottom of settings
  await page.evaluate(() => {
    const panel = document.querySelector('.exercise1-settings, [class*="settings"]');
    if (panel) panel.scrollTop = panel.scrollHeight;
  });
  await page.waitForTimeout(500);

  // Take screenshot of bottom section
  await page.screenshot({ path: 'settings-bottom.png', fullPage: true });
  console.log('Screenshot saved: settings-bottom.png');

  // Check for Instrument Sound section
  const hasInstrumentSection = await page.locator('text=Instrument Sound').isVisible();

  if (hasInstrumentSection) {
    console.log('✅ Instrument Sound section is VISIBLE on screen!');

    // Check radio buttons
    const pianoLabel = await page.locator('label:has(input[value="piano"])').first();
    const guitarLabel = await page.locator('label:has(input[value="guitar"])').first();

    const pianoText = await pianoLabel.textContent();
    const guitarText = await guitarLabel.textContent();

    console.log(`✅ Found option: ${pianoText.trim()}`);
    console.log(`✅ Found option: ${guitarText.trim()}`);

    // Check which is selected
    const pianoChecked = await page.locator('input[value="piano"]').first().isChecked();
    const guitarChecked = await page.locator('input[value="guitar"]').first().isChecked();

    console.log(`\nDefault selection:`);
    console.log(`  Piano: ${pianoChecked ? '✅ SELECTED' : '❌'}`);
    console.log(`  Guitar: ${guitarChecked ? '✅ SELECTED' : '❌'}`);

    // Test switching to guitar
    console.log('\nTesting instrument switch...');
    await guitarLabel.click();
    await page.waitForTimeout(500);

    const guitarNowChecked = await page.locator('input[value="guitar"]').first().isChecked();
    if (guitarNowChecked) {
      console.log('✅ Successfully switched to Guitar!');
    } else {
      console.log('❌ Failed to switch to Guitar');
    }

    await page.screenshot({ path: 'guitar-selected.png', fullPage: true });
    console.log('Screenshot saved: guitar-selected.png');

  } else {
    console.log('❌ Instrument Sound section is NOT visible');

    // Debug: print all text in settings
    const settingsText = await page.locator('[class*="settings"]').first().textContent();
    console.log('\nSettings panel content:');
    console.log(settingsText);
  }

  await browser.close();
  console.log('\n=== Test Complete ===\n');
}

testInstrument().catch(console.error);
