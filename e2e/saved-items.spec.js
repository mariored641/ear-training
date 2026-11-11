import { test, expect } from '@playwright/test';
import fs from 'fs';

const OUT = process.env.T5_SCREEN_DIR || '/workspace/codex-night-11-12/screens';
fs.mkdirSync(OUT, { recursive: true });

async function acceptDialogs(page) {
  page.on('dialog', (dialog) => dialog.accept());
}

async function useEnglish(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ear-training:language', 'en');
  });
}

async function wipeCaches(page) {
  await page.evaluate(async () => {
    if (!('caches' in window)) return;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  });
}

test('rhythm presets survive reload, a new context, and a cache wipe', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await useEnglish(page);
  await acceptDialogs(page);
  await page.goto('/exercise/4');
  await expect(page.getByRole('button', { name: 'Save Preset' })).toBeVisible();
  await page.getByRole('button', { name: '3/4' }).click();
  await page.getByRole('button', { name: 'Save Preset' }).click();
  await page.locator('#preset-name').fill('Lesson groove');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const stored = await page.evaluate(() => localStorage.getItem('rhythm_explorer_presets_local'));
  expect(stored).toContain('Lesson groove');
  expect(stored).toContain('3/4');

  await wipeCaches(page);
  await page.reload();
  await page.getByRole('button', { name: 'Load Preset' }).click();
  await expect(page.getByText('Lesson groove')).toBeVisible();
  await page.screenshot({ path: `${OUT}/saved-rhythm-picker-desktop.png` });
  await page.getByText('Lesson groove').click();
  await expect(page.getByRole('button', { name: '3/4' })).toHaveClass(/active/);

  const state = await context.storageState();
  const fresh = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const phone = await fresh.newPage();
  await phone.goto('/exercise/4');
  await phone.getByRole('button', { name: 'Load Preset' }).click();
  await expect(phone.getByText('Lesson groove')).toBeVisible();
  await phone.screenshot({ path: `${OUT}/saved-rhythm-picker-phone.png` });
  await fresh.close();
  await context.close();
});

test('advanced subdivision presets survive reload', async ({ page }) => {
  await useEnglish(page);
  await acceptDialogs(page);
  await page.goto('/exercise/4');
  await expect(page.getByRole('button', { name: 'Advanced Subdivisions' })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced Subdivisions' }).click();
  const division = page.locator('select.division-select').first();
  await division.selectOption('3');
  await page.getByRole('button', { name: 'Save Preset' }).click();
  await page.locator('#preset-name-adv').fill('Triplet study');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await wipeCaches(page);
  await page.reload();
  await page.getByRole('button', { name: 'Advanced Subdivisions' }).click();
  // Last-state brings the page back as it was left, before any preset is loaded.
  await expect(page.locator('select.division-select').first()).toHaveValue('3');
  await page.locator('select.division-select').first().selectOption('1');
  await page.getByRole('button', { name: 'Load Preset' }).click();
  await expect(page.getByText('Triplet study')).toBeVisible();
  await page.screenshot({ path: `${OUT}/saved-advanced-picker-desktop.png` });
  await page.getByText('Triplet study').click();
  await expect(page.locator('select.division-select').first()).toHaveValue('3');

  const stored = await page.evaluate(() => localStorage.getItem('advanced_subdivisions_presets_local'));
  expect(stored).toContain('Triplet study');
});

test('saved backing-track progressions and favorites survive reload', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await useEnglish(page);
  await page.goto('/backing-tracks');
  await expect(page.locator('.chord-bar-btn, .chord-bar-split').first()).toBeVisible();

  await page.getByRole('button', { name: /bpm$/i }).click();
  await page.locator('.bp-popup-round-btn').first().click();
  const tempoLabel = await page.getByRole('button', { name: /bpm$/i }).innerText();

  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'My Progressions' }).click();
  await page.getByRole('button', { name: 'Save current progression' }).click();
  await page.getByPlaceholder('Progression name…').fill('Tuesday changes');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Tuesday changes')).toBeVisible();
  await page.screenshot({ path: `${OUT}/saved-progressions-picker-desktop.png` });

  await page.getByRole('button', { name: 'Standards' }).click();
  await page.locator('.lib-item').first().waitFor();
  const songTitle = await page.locator('.lib-item-title').first().innerText();
  await page.locator('.lib-fav-btn').first().click();
  await page.locator('.lib-filter-btn').click();
  await expect(page.getByText(songTitle).first()).toBeVisible();
  await page.screenshot({ path: `${OUT}/saved-favorites-picker-desktop.png` });

  await wipeCaches(page);
  await page.reload();
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'My Progressions' }).click();
  await expect(page.getByText('Tuesday changes')).toBeVisible();
  await page.getByText('Tuesday changes').click();
  await expect(page.getByRole('button', { name: tempoLabel })).toBeVisible();

  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Standards' }).click();
  await page.locator('.lib-item').first().waitFor();
  await page.locator('.lib-filter-btn').click();
  await expect(page.getByText(songTitle).first()).toBeVisible();

  const state = await context.storageState();
  const phoneContext = await browser.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
  const phone = await phoneContext.newPage();
  await phone.goto('/backing-tracks');
  await phone.getByRole('button', { name: 'Templates' }).click();
  await phone.getByRole('button', { name: 'My Progressions' }).click();
  await expect(phone.getByText('Tuesday changes')).toBeVisible();
  await phone.screenshot({ path: `${OUT}/saved-progressions-picker-phone.png` });
  await phoneContext.close();
  await context.close();
});

test('partial-chord work and the looper session survive a reload', async ({ page }) => {
  await useEnglish(page);
  await page.goto('/positions');
  await expect(page.getByRole('button', { name: 'Partial Chords' })).toBeVisible();
  await page.getByRole('button', { name: 'Partial Chords' }).click();
  await page.getByRole('button', { name: '+ Add' }).click();
  await expect(page.locator('.pct-card, .partial-chord-card, .pct-chord').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  const saved = await page.evaluate(() => localStorage.getItem('et.state.v1.positions-partial-sequence'));
  expect(saved).toContain('"root"');
  await page.reload();
  await page.getByRole('button', { name: 'Partial Chords' }).click();
  const after = await page.evaluate(() => localStorage.getItem('et.state.v1.positions-partial-sequence'));
  expect(after).toBe(saved);

  await page.goto('/looper');
  await page.locator('.looper-settings-btn').evaluate((el) => el.click());
  const signature = page.locator('.looper-settings-grid select').first();
  await expect(signature).toBeVisible();
  await signature.selectOption('3/4');
  await page.waitForTimeout(800);
  await page.reload();
  await page.locator('.looper-settings-btn').evaluate((el) => el.click());
  await expect(page.locator('.looper-settings-grid select').first()).toHaveValue('3/4');
});
