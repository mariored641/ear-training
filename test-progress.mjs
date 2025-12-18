import { chromium } from '@playwright/test';

async function testProgress() {
  const browser = await chromium.launch({ headless: false }); // visible browser to see what happens
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Testing Question Counter & Progress Bar');
  console.log('═══════════════════════════════════════════════════\n');

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Start Exercise 1
  await page.locator('text=Start Practice').first().click();
  await page.waitForTimeout(2000);

  console.log('Starting Exercise 1...\n');

  // Function to answer questions by trying all notes until correct
  const answerQuestion = async (questionNum) => {
    console.log(`Answering Question ${questionNum}...`);

    const noteButtons = await page.locator('.note-buttons button, button[class*="note-button"]').all();

    for (const button of noteButtons) {
      const noteText = await button.textContent();
      await button.click();
      await page.waitForTimeout(300);

      // Check if we see "Correct" message
      const bodyText = await page.textContent('body');
      if (bodyText.includes('Correct')) {
        console.log(`  ✅ Correct answer was: ${noteText.trim()}`);
        await page.waitForTimeout(2000); // Wait for auto-transition
        return true;
      }
    }

    return false;
  };

  // Answer 3 questions and track progress
  for (let i = 1; i <= 3; i++) {
    // Take screenshot before answering
    await page.screenshot({ path: `progress-q${i}-before.png` });

    // Get current question number from header
    const headerText = await page.textContent('header, .header');
    console.log(`Header shows: ${headerText.includes(`${i}/10`) ? `Question ${i}/10 ✅` : `UNEXPECTED: ${headerText}`}`);

    // Answer the question
    await answerQuestion(i);

    // Take screenshot after answering
    await page.screenshot({ path: `progress-q${i}-after.png` });

    await page.waitForTimeout(500);
  }

  // Final check
  const finalHeader = await page.textContent('header, .header');
  console.log(`\nFinal header: ${finalHeader}`);

  if (finalHeader.includes('4/10')) {
    console.log('✅ SUCCESS - Now on Question 4!\n');
  } else {
    console.log('❌ FAIL - Not on Question 4\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('Check the screenshots to see the progress bar.');
  console.log('═══════════════════════════════════════════════════\n');

  await page.waitForTimeout(3000);
  await browser.close();
}

testProgress().catch(console.error);
