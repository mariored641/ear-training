import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing Auto-Transition Audio Fix...\\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    devtools: false
  });

  try {
    const page = await browser.newPage();

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`📝 ${text}`);
    });

    // Collect errors
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });

    console.log('🌐 Opening Exercise 1...\\n');
    await page.goto('http://localhost:5174/exercise1', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log('✅ Page loaded\\n');
    console.log('⏳ Waiting 3 seconds for initialization...\\n');
    await page.waitForTimeout(3000);

    // Extract the note that was played on load
    const playedNotesFromConsole = consoleMessages
      .filter(msg => msg.includes('playQuestionAudio called with:'))
      .map(msg => {
        const match = msg.match(/playQuestionAudio called with: ([A-G]#?\\d+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    console.log(`\\n🎵 Initial note played: ${playedNotesFromConsole[0] || 'Unknown'}\\n`);

    // Find all note buttons
    const noteButtons = await page.$$('.note-button');

    if (noteButtons.length === 0) {
      console.log('❌ No note buttons found!\\n');
      return;
    }

    console.log(`✅ Found ${noteButtons.length} note buttons\\n`);

    // Click first button (likely wrong answer)
    console.log('🖱️  Clicking first note button...\\n');
    await noteButtons[0].click();
    await page.waitForTimeout(500);

    // Check if it was wrong (should see red flash)
    const wasWrong = await page.evaluate(() => {
      const button = document.querySelector('.note-button.incorrect');
      return button !== null;
    });

    if (wasWrong) {
      console.log('❌ Answer was incorrect (expected)\\n');
      await page.waitForTimeout(600); // Wait for red flash to clear
    }

    // Now click correct answer - get it from state
    console.log('🎵 Getting the correct note from state...\\n');

    const correctNote = await page.evaluate(() => {
      // Try to access React component state via the DOM
      const buttons = Array.from(document.querySelectorAll('.note-button'));
      // We'll just try clicking each until we get correct
      return null; // We'll use a different approach
    });

    // Alternative: just click buttons until we get success
    let foundCorrect = false;
    for (let i = 0; i < noteButtons.length && !foundCorrect; i++) {
      const buttons = await page.$$('.note-button:not(.correct)');
      if (buttons.length === 0) break;

      await buttons[0].click();
      await page.waitForTimeout(300);

      const isCorrect = await page.evaluate(() => {
        const successMsg = document.querySelector('.status-message.success');
        return successMsg !== null && successMsg.textContent.includes('Correct');
      });

      if (isCorrect) {
        foundCorrect = true;
        console.log('✅ Found correct answer!\\n');
      }
    }

    if (!foundCorrect) {
      console.log('⚠️  Could not find correct answer\\n');
      return;
    }

    console.log('⏳ Waiting for auto-transition (1 second)...\\n');
    await page.waitForTimeout(1200);

    // Now check what note was played after transition
    const notesAfterTransition = consoleMessages
      .filter(msg => msg.includes('playQuestionAudio called with:'))
      .map(msg => {
        const match = msg.match(/playQuestionAudio called with: ([A-G]#?\\d+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    console.log(`\\n📊 All notes played during test: ${notesAfterTransition.join(', ')}\\n`);

    if (notesAfterTransition.length >= 2) {
      console.log(`\\n🎵 Note after auto-transition: ${notesAfterTransition[notesAfterTransition.length - 1]}\\n`);

      // Now click "Play Note" button to verify it matches
      console.log('🎵 Clicking "Play Note" button to verify...\\n');
      const playNoteButton = await page.$('button:has-text("Play Note")');

      if (!playNoteButton) {
        // Try alternative selector
        const buttons = await page.$$('.audio-button');
        if (buttons.length >= 2) {
          await buttons[1].click();
          await page.waitForTimeout(1500);
        }
      } else {
        await playNoteButton.click();
        await page.waitForTimeout(1500);
      }

      const finalNotes = consoleMessages
        .filter(msg => msg.includes('playQuestionAudio called with:') || msg.includes('playNote'))
        .slice(-3);

      console.log(`\\n📝 Recent audio calls: ${finalNotes.join('\\n')}\\n`);

      console.log('\\n✅ Test complete! Check the notes above.\\n');
      console.log('The note after auto-transition should match the note played when clicking "Play Note".\\n');
    }

    console.log('\\n⏸️  Keeping browser open for 15 seconds for manual verification...\\n');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.log(`\\n❌ Error: ${error.message}\\n`);
  } finally {
    await browser.close();
    console.log('\\n✅ Done\\n');
  }
})();
