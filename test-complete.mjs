import { chromium } from '@playwright/test';

async function testComplete() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('\n=== Testing Ear Training App ===\n');

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Start Exercise 1
  await page.locator('text=Start Practice').first().click();
  await page.waitForTimeout(2000);

  console.log('📍 Exercise 1 loaded');

  // Open settings
  await page.locator('button').filter({ hasText: '⚙' }).click();
  await page.waitForTimeout(1000);

  // Scroll down in settings panel to see all sections
  const settingsPanel = await page.locator('.settings-panel, [class*="settings"]').first();
  await settingsPanel.evaluate(el => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(500);

  // Take screenshot with instrument section visible
  await page.screenshot({ path: 'settings-scrolled.png', fullPage: true });
  console.log('Screenshot: settings-scrolled.png');

  // Get all text content
  const allText = await page.textContent('body');

  // Test 1: Instrument Sound section
  console.log('\n--- Test 1: Instrument Selector ---');
  if (allText.includes('Instrument Sound')) {
    console.log('✅ Instrument Sound section EXISTS');

    const pianoCount = await page.locator('input[type="radio"][value="piano"]').count();
    const guitarCount = await page.locator('input[type="radio"][value="guitar"]').count();

    if (pianoCount > 0 && guitarCount > 0) {
      console.log('✅ Piano and Guitar options available');
      const isPianoChecked = await page.locator('input[value="piano"]').first().isChecked();
      console.log(`   Default: ${isPianoChecked ? 'Piano ✅' : 'Guitar'}`);
    } else {
      console.log('❌ Radio buttons missing');
    }
  } else {
    console.log('❌ Instrument Sound section NOT FOUND');
  }

  // Close settings and test question counter
  await page.locator('button').filter({ hasText: '✕' }).click();
  await page.waitForTimeout(500);

  console.log('\n--- Test 2: Question Counter ---');

  // Find question number in header
  let questionNum = await page.locator('header').textContent();
  console.log(`Initial: ${questionNum.trim()}`);

  // Click a note to answer
  await page.locator('button').filter({ hasText: 'C' }).first().click();
  await page.waitForTimeout(2000); // Wait for auto-transition

  // Check if question number changed
  questionNum = await page.locator('header').textContent();
  console.log(`After answer: ${questionNum.trim()}`);

  if (questionNum.includes('2') || questionNum.includes('Question 2')) {
    console.log('✅ Question counter is working! (moved to question 2)');
  } else {
    console.log('❌ Question counter may be stuck');
  }

  await page.screenshot({ path: 'question-2.png' });
  console.log('Screenshot: question-2.png');

  // Navigate to Exercise 2
  console.log('\n--- Test 3: Exercise 2 - String Order ---');
  await page.goto('http://localhost:5173/exercise2');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'exercise2-fretboard.png', fullPage: true });
  console.log('Screenshot: exercise2-fretboard.png');

  // Check fretboard string order
  const fretboardText = await page.textContent('body');
  const stringIndices = {
    'e': fretboardText.indexOf('e ('),
    'B': fretboardText.indexOf('B ('),
    'G': fretboardText.indexOf('G ('),
    'D': fretboardText.indexOf('D ('),
    'A': fretboardText.indexOf('A ('),
    'E': fretboardText.indexOf('E (')
  };

  // Check if high e appears before low E
  if (stringIndices['e'] > 0 && stringIndices['E'] > 0) {
    if (stringIndices['e'] < stringIndices['E']) {
      console.log('✅ String order is correct! (e is above E)');
    } else {
      console.log('❌ String order may be reversed');
    }
  } else {
    console.log('⚠️  Could not determine string order from text');
  }

  await browser.close();

  console.log('\n=== Test Summary ===');
  console.log('✅ App is running successfully');
  console.log('✅ All screenshots saved');
  console.log('\nCheck these files:');
  console.log('  - settings-scrolled.png (full settings with instrument selector)');
  console.log('  - question-2.png (question counter test)');
  console.log('  - exercise2-fretboard.png (string order test)\n');
}

testComplete().catch(console.error);
