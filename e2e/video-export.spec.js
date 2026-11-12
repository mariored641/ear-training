import { test, expect } from '@playwright/test';
import fs from 'fs';

// Real-time export: needs the sound packs and ~30-60 s of wall clock.
test.setTimeout(240000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ear-training:language', 'en'));
});

async function openDialog(page) {
  await page.goto('/backing-tracks');
  await page.getByTestId('open-video-export').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('opening the dialog and restoring saved settings never starts playback or export', async ({ page }) => {
  await openDialog(page);
  await expect(page.getByTestId('vx-start')).toBeVisible();
  await expect(page.getByTestId('vx-progress')).toHaveCount(0);
  await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '+' }).click();
  await page.getByRole('button', { name: /Add view/ }).click();
  await expect(page.getByTestId('vx-view')).toHaveCount(2);
  await page.waitForTimeout(400); // debounce flush
  await page.reload();
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-view')).toHaveCount(2);
  await expect(page.getByTestId('vx-repetitions')).toHaveText('5');
  await expect(page.getByTestId('vx-progress')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('layout stays LTR in Hebrew and the dialog is translated', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ear-training:language', 'he'));
  await openDialog(page);
  await expect(page.getByRole('dialog')).toContainText('ייצוא וידאו');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.vx-dialog')).direction)).toBe('ltr');
});

test('exports 2 repetitions with a neck change each repetition, audio + video', async ({ page }, info) => {
  await openDialog(page);
  await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '−' }).click();
  await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '−' }).click();
  await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '−' }).click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('1');
  await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '+' }).click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('2');
  await page.getByRole('button', { name: /Split neck into positions/ }).click();
  await page.getByTestId('vx-view').nth(0).locator('select').first().selectOption('dorian');
  await page.getByTestId('vx-start').click();
  await expect(page.getByTestId('vx-progress')).toBeVisible();
  await expect(page.getByTestId('vx-result')).toBeVisible({ timeout: 200000 });

  const info2 = await page.evaluate(async () => {
    const v = document.querySelector('.vx-preview');
    const blob = await (await fetch(v.src)).blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { type: blob.type, size: blob.size, b64: btoa(bin), name: document.querySelector('[data-testid=vx-download]').download };
  });
  expect(info2.size).toBeGreaterThan(20000);
  expect(info2.name).toMatch(/\.(mp4|webm)$/);
  const out = process.env.VIDEO_EXPORT_OUT || info.outputPath('sample' + (info2.type.includes('mp4') ? '.mp4' : '.webm'));
  const finalOut = out.replace(/\.(mp4|webm)$/, info2.type.includes('mp4') ? '.mp4' : '.webm');
  fs.writeFileSync(finalOut, Buffer.from(info2.b64, 'base64'));
  console.log('SAVED', finalOut, info2.type, info2.size);
});
