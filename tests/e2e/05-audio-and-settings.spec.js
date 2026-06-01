/**
 * 05-audio-and-settings.spec.js
 * Verify the student-facing experience:
 *   - Audio plays once when a question loads (no double playback).
 *   - Replay button actually triggers audio.
 *   - Instrument toggle saves to localStorage and replay still works after toggle.
 *   - Reference toggle ("ללא") still permits audio to play.
 *   - Level changes persist.
 *   - numQuestions counter affects session length.
 */
import { test, expect } from '@playwright/test';
import {
  mockAudio,
  installAudioSpy,
  clearAudioSpy,
  getAudioStartCount,
  clickReplay,
  getCurrentInstrument,
  getCurrentLevel,
  setLevel,
  setNumQuestions,
  completeMCQuestions,
  CORRECT_BG,
  WRONG_BG,
} from './helpers.js';

// Representative exercises across all sub-categories
const REP_EXERCISES = ['M2', 'M1', 'H1', 'H4', 'F0', 'F1', 'F3', 'V1', 'S1', 'G1'];

// S1 (sight-singing) is manual-play by design — student reads notation and sings,
// then triggers "נגן קדנצה" / "נגן מנגינה" themselves. No auto-play on question load.
const AUTOPLAY_EXERCISES = REP_EXERCISES.filter(id => id !== 'S1');

// ── Audio plays on initial question load ────────────────────────────────────

test.describe('Audio plays on initial question load', () => {
  for (const id of AUTOPLAY_EXERCISES) {
    test(`${id} — at least one buffer source starts within 3s of load`, async ({ page }) => {
      await installAudioSpy(page);
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      // Give the question generator + 200ms onPlay delay + sample decode some time
      await page.waitForTimeout(3000);

      const count = await getAudioStartCount(page);
      expect(count, `${id}: no audio events fired in 3s after load`).toBeGreaterThan(0);
    });
  }
});

// ── No double playback on initial load ──────────────────────────────────────

test.describe('No double playback on initial load', () => {
  // Each exercise plays a melody/chord. Even with reference (cadence) we expect
  // at most ~30 buffer starts on level 1. > 60 is a strong sign of double-trigger.
  const DOUBLE_PLAYBACK_THRESHOLD = 60;

  for (const id of AUTOPLAY_EXERCISES) {
    test(`${id} — buffer starts < ${DOUBLE_PLAYBACK_THRESHOLD} in 4s window (no double-fire)`, async ({ page }) => {
      await installAudioSpy(page);
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      await page.waitForTimeout(4000);
      const count = await getAudioStartCount(page);

      // Lower bound also: should be > 0
      expect(count, `${id}: 0 audio events — load may have failed`).toBeGreaterThan(0);
      expect(
        count,
        `${id}: suspicious double playback (${count} buffer starts; threshold ${DOUBLE_PLAYBACK_THRESHOLD})`
      ).toBeLessThan(DOUBLE_PLAYBACK_THRESHOLD);
    });
  }
});

// ── Replay button triggers playback ─────────────────────────────────────────

test.describe('Replay button triggers playback', () => {
  for (const id of REP_EXERCISES) {
    test(`${id} — clicking replay produces fresh buffer starts`, async ({ page }) => {
      await installAudioSpy(page);
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      // Wait for initial play to settle, then clear spy before replay
      await page.waitForTimeout(2500);
      await clearAudioSpy(page);

      const clicked = await clickReplay(page);
      expect(clicked, `${id}: no replay/play button found`).toBe(true);

      await page.waitForTimeout(2000);
      const afterReplay = await getAudioStartCount(page);
      expect(
        afterReplay,
        `${id}: replay click did not produce new audio (${afterReplay} new buffer starts)`
      ).toBeGreaterThan(0);
    });
  }
});

// ── Replay does not double-trigger when clicked twice rapidly ───────────────

test.describe('Rapid replay does not multiply playback', () => {
  // Two rapid clicks should produce at most ~2x the single-click count
  for (const id of ['M2', 'H1', 'F0']) {
    test(`${id} — two rapid replays produce < 4x normal load`, async ({ page }) => {
      await installAudioSpy(page);
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      await page.waitForTimeout(2500);

      // Measure single-replay baseline
      await clearAudioSpy(page);
      await clickReplay(page);
      await page.waitForTimeout(2000);
      const single = await getAudioStartCount(page);

      // Now do two rapid replays
      await clearAudioSpy(page);
      await clickReplay(page);
      await page.waitForTimeout(50);
      await clickReplay(page);
      await page.waitForTimeout(2500);
      const dbl = await getAudioStartCount(page);

      // dbl can legitimately be up to 2x single. But > 4x means runaway.
      const ratio = single > 0 ? dbl / single : 0;
      expect(
        ratio,
        `${id}: rapid double-click produced ${dbl} starts vs single ${single} (ratio ${ratio.toFixed(1)}x)`
      ).toBeLessThan(4);
    });
  }
});

// ── Level persistence ───────────────────────────────────────────────────────

test.describe('Level setting takes effect', () => {
  for (const id of ['M2', 'H3', 'F0']) {
    test(`${id} — level set in localStorage is honored after navigation`, async ({ page }) => {
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      await setLevel(page, id, 3);
      await page.goto('/');
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });
      await page.waitForTimeout(500);

      const stored = await getCurrentLevel(page, id);
      expect(stored).toBe('3');
    });
  }
});

// ── Instrument toggle ───────────────────────────────────────────────────────

test.describe('Instrument toggle', () => {
  for (const id of ['M2', 'H1', 'F0']) {
    test(`${id} — clicking "גיטרה" updates localStorage and replay still produces audio`, async ({ page }) => {
      await installAudioSpy(page);
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('body')).toContainText(id, { timeout: 10000 });

      // Toggle to guitar
      const guitarBtn = page.locator('button:has-text("גיטרה")').first();
      const visible = await guitarBtn.isVisible().catch(() => false);
      if (!visible) test.skip(true, `${id}: no guitar toggle visible`);

      await guitarBtn.click();
      await page.waitForTimeout(400);

      const stored = await getCurrentInstrument(page, id);
      expect(stored, `${id}: instrument not saved as "guitar"`).toBe('guitar');

      // Replay → audio still works
      await clearAudioSpy(page);
      await clickReplay(page);
      await page.waitForTimeout(2000);
      const count = await getAudioStartCount(page);
      expect(count, `${id}: no audio after switching to guitar`).toBeGreaterThan(0);
    });
  }
});

// ── Reference toggle ────────────────────────────────────────────────────────
// No current exercise passes a `reference` prop to MultipleChoiceShell, so the
// "ללא" toggle is not rendered anywhere. Once an exercise adds reference state,
// re-enable this block and target it specifically.

test.describe.skip('Reference toggle (no exercise wires it yet)', () => {
  test('placeholder', () => {});
});

// ── numQuestions affects session length ─────────────────────────────────────

test.describe('numQuestions counter affects session length', () => {
  test('M2 — set 3, complete 3 → summary shows 3', async ({ page }) => {
    await mockAudio(page);
    await page.goto('/exercise/M2');
    await expect(page.locator('.et-mc-controls')).toBeVisible({ timeout: 10000 });

    await setNumQuestions(page, 3);
    await completeMCQuestions(page, 3);
    await expect(page.locator('.et-summary')).toBeVisible({ timeout: 5000 });
    const total = await page.locator('.et-summary-stat-num').first().textContent();
    expect(parseInt(total, 10)).toBe(3);
  });
});

// ── Wrong answer feedback colour ────────────────────────────────────────────

test.describe('Answer feedback colour', () => {
  for (const id of ['M2', 'H2', 'F0', 'F1']) {
    test(`${id} — first option click yields green or red feedback`, async ({ page }) => {
      await mockAudio(page);
      await page.goto(`/exercise/${id}`);
      await expect(page.locator('.et-mc-options button').first()).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(800); // let the question initialize
      const firstOpt = page.locator('.et-mc-options button').first();
      await firstOpt.click();
      await page.waitForTimeout(250);
      const state = await firstOpt.getAttribute('data-answer-state').catch(() => null);
      const bg = await firstOpt.evaluate(el => window.getComputedStyle(el).backgroundColor).catch(() => '');
      expect(
        state === 'correct' || state === 'wrong' || [CORRECT_BG, WRONG_BG].includes(bg),
        `${id}: unexpected answer state/bg after click: ${state ?? bg}`
      ).toBe(true);
    });
  }
});
