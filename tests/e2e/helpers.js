/**
 * Shared test helpers for ear-training E2E tests.
 */

const CORRECT_BG = 'rgb(45, 187, 91)';
const WRONG_BG   = 'rgb(231, 76, 60)';

/**
 * Build a minimal valid silent WAV buffer (44-byte header + 2 bytes of silence).
 * Browsers can decode this with the real AudioContext.decodeAudioData.
 */
function silentWav() {
  const buf = Buffer.alloc(46);
  let o = 0;
  buf.write('RIFF', o); o += 4;
  buf.writeUInt32LE(38, o); o += 4;    // file size - 8
  buf.write('WAVE', o); o += 4;
  buf.write('fmt ', o); o += 4;
  buf.writeUInt32LE(16, o); o += 4;    // fmt chunk size
  buf.writeUInt16LE(1, o); o += 2;     // PCM format
  buf.writeUInt16LE(1, o); o += 2;     // mono
  buf.writeUInt32LE(44100, o); o += 4; // sample rate
  buf.writeUInt32LE(88200, o); o += 4; // byte rate
  buf.writeUInt16LE(2, o); o += 2;     // block align
  buf.writeUInt16LE(16, o); o += 2;    // bits per sample
  buf.write('data', o); o += 4;
  buf.writeUInt32LE(2, o); o += 4;     // data size (2 bytes)
  // two zero-bytes of silence already present (Buffer.alloc initialises to 0)
  return buf;
}

/**
 * Intercept audio file network requests so the browser gets valid (but silent)
 * audio quickly, instead of downloading large CDN samples.
 * We do NOT mock AudioContext — the real one works with --autoplay-policy=no-user-gesture-required.
 */
export async function mockAudio(page) {
  const wav = silentWav();

  // Intercept sample files from Tone.js / Gleitz CDNs
  await page.route('**/tonejs.github.io/**', route =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: wav })
  );
  await page.route('**/gleitz.github.io/**', route =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: wav })
  );

  // Intercept any stray .mp3 / .ogg / .wav / .flac requests
  await page.route(/\.(mp3|ogg|flac)(\?.*)?$/, route =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: wav })
  );
}

/**
 * Navigate to an exercise and wait for the header title to appear.
 */
export async function goToExercise(page, id) {
  await page.goto(`/exercise/${id}`);
  // Wait for React to mount (Suspense + lazy load)
  await page.waitForSelector('h1, [class*="header"] h2, .et-mc-shell, [style*="direction: rtl"]', { timeout: 10000 });
}

/**
 * Click option buttons in MultipleChoiceShell (.et-mc-options) one by one until
 * the correct one (turns green) is found. Returns when the correct answer is clicked.
 */
export async function answerMCQuestion(page) {
  const opts = page.locator('.et-mc-options button');
  await opts.first().waitFor({ timeout: 8000 });
  const count = await opts.count();

  for (let i = 0; i < count; i++) {
    const btn = opts.nth(i);
    // Skip if already disabled (already correctly answered)
    const disabled = await btn.isDisabled().catch(() => false);
    if (disabled) continue;

    await btn.click();
    await page.waitForTimeout(200);

    const state = await btn.getAttribute('data-answer-state').catch(() => null);
    const bg = await btn.evaluate(el => window.getComputedStyle(el).backgroundColor).catch(() => '');
    if (state === 'correct' || bg === CORRECT_BG) {
      // Correct! Wait for auto-advance (800ms in shell)
      await page.waitForTimeout(1000);
      return;
    }
    // Wrong answer — wait for red feedback to clear (600ms + buffer)
    await page.waitForTimeout(800);
  }
}

/**
 * Complete `n` questions in a MultipleChoiceShell exercise.
 * Stops early if the session summary appears.
 */
export async function completeMCQuestions(page, n) {
  for (let i = 0; i < n; i++) {
    const summaryVisible = await page.locator('.et-summary').isVisible().catch(() => false);
    if (summaryVisible) return;
    await answerMCQuestion(page);
    // Small buffer between questions
    await page.waitForTimeout(300);
  }
}

/**
 * Click option buttons in a standalone exercise (M1 uses a noteGrid div, V1/F3 use custom optGrid).
 * Selector should match the container of the answer buttons.
 */
export async function answerStandaloneQuestion(page, containerSelector) {
  const opts = page.locator(`${containerSelector} button`);
  await opts.first().waitFor({ timeout: 8000 });
  const count = await opts.count();

  for (let i = 0; i < count; i++) {
    const btn = opts.nth(i);
    const disabled = await btn.isDisabled().catch(() => false);
    if (disabled) continue;

    await btn.click();
    await page.waitForTimeout(200);

    const bg = await btn.evaluate(el => window.getComputedStyle(el).backgroundColor).catch(() => '');
    if (bg === CORRECT_BG) {
      await page.waitForTimeout(1000);
      return true;
    }
    await page.waitForTimeout(800);
  }
  return false;
}

/**
 * Read numQuestions value from the counter on screen.
 */
export async function getNumQuestions(page) {
  const val = await page.locator('.et-counter-value').first().textContent().catch(() => null);
  return val ? parseInt(val, 10) : null;
}

/**
 * Set numQuestions via the counter + button. Clicks until value matches target.
 */
export async function setNumQuestions(page, target) {
  const current = await getNumQuestions(page);
  if (current === null) return;
  const diff = target - current;
  const btnLabel = diff > 0 ? 'הוסף' : 'הפחת';
  const btn = page.locator(`.et-counter-btn[aria-label="${btnLabel}"]`).first();
  for (let i = 0; i < Math.abs(diff); i++) {
    await btn.click();
    await page.waitForTimeout(50);
  }
}

// ── Audio spy helpers ────────────────────────────────────────────────────────

/**
 * Install a spy on AudioBufferSourceNode.prototype.start that logs each
 * call to window.__bufferStarts. Must be called BEFORE page.goto().
 *
 * Each entry is { time: performance.now(), when: scheduledTime }.
 * Use to detect: (a) audio plays at all, (b) double playback (2x expected count).
 */
export async function installAudioSpy(page) {
  await page.addInitScript(() => {
    window.__bufferStarts = [];
    window.__audioSpyInstalled = true;
    const proto = window.AudioBufferSourceNode && window.AudioBufferSourceNode.prototype;
    if (!proto || proto.__patched) return;
    const orig = proto.start;
    proto.start = function (when, ...args) {
      try {
        window.__bufferStarts.push({ time: performance.now(), when: when ?? 0 });
      } catch (_) {}
      return orig.apply(this, [when, ...args]);
    };
    proto.__patched = true;
  });
}

/** Reset the buffer-start log. */
export async function clearAudioSpy(page) {
  await page.evaluate(() => { window.__bufferStarts = []; });
}

/** Total number of buffer-start calls since the spy was installed (or last clear). */
export async function getAudioStartCount(page) {
  return await page.evaluate(() => (window.__bufferStarts || []).length);
}

/** Buffer-start calls that occurred at or after a given performance.now() timestamp. */
export async function countBufferStartsAfter(page, sincePerfNow) {
  return await page.evaluate(
    (since) => (window.__bufferStarts || []).filter(e => e.time >= since).length,
    sincePerfNow
  );
}

/** Get current performance.now() inside the page. */
export async function pageNow(page) {
  return await page.evaluate(() => performance.now());
}

// ── UI helpers ──────────────────────────────────────────────────────────────

/**
 * Click the replay/play button. Tries common Hebrew variants.
 * Returns true if a button was clicked, false otherwise.
 */
export async function clickReplay(page) {
  const candidates = [
    'button:has-text("נגן שוב")',
    'button:has-text("נגן מנגינה")',
    'button:has-text("נגן רצף")',
    'button:has-text("בסיס")',     // H4 (זיהוי טנשנים) — primary play button
    'button:has-text("▶")',
    'button:has-text("נגן")',
  ];
  for (const sel of candidates) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      return true;
    }
  }
  return false;
}

/** Read level for an exercise from localStorage. */
export async function getCurrentLevel(page, id) {
  return await page.evaluate(
    (id) => localStorage.getItem(`ear-training:${id}:level`),
    id
  );
}

/** Pre-set level via localStorage (avoids fragile UI clicks). */
export async function setLevel(page, id, level) {
  await page.evaluate(
    ({ id, level }) => localStorage.setItem(`ear-training:${id}:level`, String(level)),
    { id, level }
  );
}

/** Read instrument for an exercise from localStorage. */
export async function getCurrentInstrument(page, id) {
  return await page.evaluate(
    (id) => localStorage.getItem(`ear-training:${id}:instrument`),
    id
  );
}

export { CORRECT_BG, WRONG_BG };
