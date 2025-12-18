import { chromium } from '@playwright/test';

async function testBugFixes() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Testing Bug Fixes');
  console.log('═══════════════════════════════════════════════════\n');

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Start Exercise 1
  await page.locator('text=Start Practice').first().click();
  await page.waitForTimeout(2000);

  console.log('🔍 Testing Question Counter Progress...\n');

  // Take initial screenshot
  await page.screenshot({ path: 'bug-test-q1.png' });

  // Get initial header text
  let headerText = await page.locator('.header, header').textContent();
  console.log(`Question 1 header: ${headerText.trim()}`);

  // Click first note to answer
  const firstNote = await page.locator('button').filter({ hasText: /^[CDEFGAB]#?$/ }).first();
  await firstNote.click();

  // Wait for transition
  await page.waitForTimeout(2500);

  // Take screenshot after answering
  await page.screenshot({ path: 'bug-test-q2.png' });

  // Get new header text
  headerText = await page.locator('.header, header').textContent();
  console.log(`After answering: ${headerText.trim()}`);

  // Check if progressed to question 2
  if (headerText.includes('2')) {
    console.log('✅ PASS - Question counter progressed to 2!\n');
  } else {
    console.log('❌ FAIL - Question counter did not progress\n');
  }

  // Answer another question
  const secondNote = await page.locator('button').filter({ hasText: /^[CDEFGAB]#?$/ }).first();
  await secondNote.click();
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'bug-test-q3.png' });

  headerText = await page.locator('.header, header').textContent();
  console.log(`After second answer: ${headerText.trim()}`);

  if (headerText.includes('3')) {
    console.log('✅ PASS - Question counter continued to 3!\n');
  } else {
    console.log('❌ FAIL - Question counter stuck\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  Test Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('\nScreenshots saved:');
  console.log('  • bug-test-q1.png - Question 1');
  console.log('  • bug-test-q2.png - Question 2');
  console.log('  • bug-test-q3.png - Question 3\n');
  console.log('Note: Instrument sound difference (piano vs guitar)');
  console.log('      can only be heard by playing the app manually.\n');

  await browser.close();
}

testBugFixes().catch(console.error);
