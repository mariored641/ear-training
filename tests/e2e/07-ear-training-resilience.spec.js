/**
 * Resilience tests for student edge cases:
 * - a wrong answer must not block the next correct click;
 * - leaving an exercise must cancel pending playback chains;
 * - changing question state must not leave stale timers behind.
 */
import { test, expect } from '@playwright/test';
import {
  mockAudio,
  installAudioSpy,
  clearAudioSpy,
  getAudioStartCount,
} from './helpers.js';

test.describe('Ear-training resilience', () => {
  test('M2: wrong answer still allows the correct answer click', async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await mockAudio(page);
    await page.goto('/exercise/M2');
    await expect(page.locator('.et-mc-options button')).toHaveCount(3, { timeout: 10000 });

    const options = page.locator('.et-mc-options button');
    await options.first().click();
    await expect(options.first()).toHaveAttribute('data-answer-state', 'wrong');
    await expect(options.last()).toBeEnabled();

    await options.last().click();
    await expect(options.last()).toHaveAttribute('data-answer-state', 'correct');
  });

  test('F0: navigating away cancels pending playback work', async ({ page }) => {
    await installAudioSpy(page);
    await mockAudio(page);
    await page.goto('/exercise/F0');
    await expect(page.locator('.et-mc-options button').first()).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
    await clearAudioSpy(page);
    await page.goto('/category/ear-training');
    await page.waitForTimeout(2500);

    const startsAfterLeave = await getAudioStartCount(page);
    expect(startsAfterLeave).toBe(0);
  });

  test('M2: rapid replay then correct answer advances only once', async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await mockAudio(page);
    await page.goto('/exercise/M2');
    await expect(page.locator('.et-mc-options button')).toHaveCount(3, { timeout: 10000 });

    const playButton = page.locator('button:has-text("נגן שוב"), button:has-text("Play")').first();
    await playButton.click();
    await playButton.click();

    await page.locator('.et-mc-options button').last().click();
    await expect(page.locator('.et-mc-options button').last()).toHaveAttribute('data-answer-state', 'correct');
    await page.waitForTimeout(1100);

    await expect(page.locator('.et-mc-options button').first()).toBeVisible();
    await expect(page.locator('.et-summary')).toHaveCount(0);
  });
});
