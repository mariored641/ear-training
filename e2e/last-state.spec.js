import { test, expect } from '@playwright/test';
import fs from 'fs';

const OUT = process.env.T5_SCREEN_DIR || '/workspace/codex-night-11-12/screens';
fs.mkdirSync(OUT, { recursive: true });

async function useEnglish(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ear-training:language', 'en');
  });
}

test('rhythm, positions, and backing tracks come back as left, stopped', async ({ page }) => {
  await useEnglish(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/exercise/4');
  await page.getByRole('button', { name: '3/4' }).click();
  await page.getByRole('button', { name: 'Polyrhythm' }).click();
  await page.locator('.row-controls .control-btn').first().click();
  await page.goto('/');
  await page.goto('/exercise/4');
  await expect(page.getByRole('button', { name: 'Polyrhythm' })).toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.getByRole('button', { name: 'Rhythm Explorer' }).click();
  await expect(page.getByRole('button', { name: '3/4' })).toHaveClass(/active/);

  await page.reload();
  await expect(page.getByRole('button', { name: '3/4' })).toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/last-state-rhythm-desktop.png` });

  await page.goto('/positions');
  await page.locator('select.root-select').selectOption('G');
  await page.getByRole('button', { name: 'All Scales' }).click();
  await page.goto('/');
  await page.goto('/positions');
  await expect(page.getByRole('button', { name: 'All Scales' })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Positions', exact: true }).click();
  await expect(page.locator('select.root-select')).toHaveValue('G');

  await page.goto('/backing-tracks');
  await expect(page.locator('.chord-bar-btn, .chord-bar-split').first()).toBeVisible();
  const before = await page.getByRole('button', { name: /bpm$/i }).innerText();
  await page.getByRole('button', { name: /bpm$/i }).click();
  await page.locator('.bp-popup-round-btn').first().click();
  const after = await page.getByRole('button', { name: /bpm$/i }).innerText();
  expect(after).not.toBe(before);
  await page.goto('/');
  await page.goto('/backing-tracks');
  await expect(page.getByRole('button', { name: after })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.screenshot({ path: `${OUT}/last-state-backing-desktop.png` });
});

test('partial chord presets save, reload, and load again', async ({ page }) => {
  await useEnglish(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/positions');
  await page.getByRole('button', { name: 'Partial Chords' }).click();
  await page.getByRole('button', { name: '+ Add' }).click();
  await expect(page.locator('.pcc-card')).toHaveCount(1);

  await page.getByRole('button', { name: 'Save Preset' }).click();
  await page.getByLabel('Preset Name').fill('Autumn leaves voicing');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.screenshot({ path: `${OUT}/partial-chords-preset-desktop.png` });

  await page.reload();
  await expect(page.getByRole('button', { name: 'Partial Chords' })).toHaveClass(/active/);
  await expect(page.locator('.pcc-card')).toHaveCount(1);
  const picker = page.getByLabel('Load Preset');
  await expect(picker.locator('option', { hasText: 'Autumn leaves voicing' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('.pcc-card')).toHaveCount(0);
  await picker.selectOption({ label: 'Autumn leaves voicing' });
  await expect(page.locator('.pcc-card')).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.pcc-card')).toHaveCount(1);
  await page.screenshot({ path: `${OUT}/partial-chords-preset-phone.png` });
});

test('a corrupt last-state blob falls back instead of breaking the page', async ({ page }) => {
  await useEnglish(page);
  await page.addInitScript(() => {
    localStorage.setItem('ear-training:last-state:rhythm', '{not json');
    localStorage.setItem('ear-training:last-state:positions', JSON.stringify({ v: 99, data: { activeTab: 'nope' } }));
  });
  await page.goto('/exercise/4');
  await expect(page.getByRole('button', { name: 'Rhythm Explorer' })).toBeVisible();
  await expect(page.getByRole('button', { name: '4/4' })).toHaveClass(/active/);
  await page.goto('/positions');
  await expect(page.getByRole('button', { name: 'Positions' })).toHaveClass(/active/);
  await page.goto('/exercise/M1');
  await expect(page.getByRole('button', { name: /Play|נגן/i }).first()).toBeVisible();
  await page.goto('/exercise/R1');
  await expect(page.locator('select').first()).toBeVisible();
});
