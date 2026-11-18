import { test, expect } from '@playwright/test';
import { lessonPreset } from '../src/data/lessonBackingTracks.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('ear-training:language')) localStorage.setItem('ear-training:language', 'en'); });
});

test('positions: octave + 3-per-string shapes show exactly their cells and survive reload', async ({ page }) => {
  await page.goto('/positions');
  // A minor (default) — octave position 1-3-4 has 20 cells, all in A minor.
  await page.getByRole('button', { name: 'Octave position 1-3-4' }).click();
  await expect(page.locator('.fretboard .fretboard-note')).toHaveCount(20);
  await page.getByRole('button', { name: 'Octave position 1-3-4' }).click();
  await page.getByRole('button', { name: '3 notes per string – from degree 6' }).click();
  await expect(page.locator('.fretboard .fretboard-note')).toHaveCount(18);
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByRole('button', { name: '3 notes per string – from degree 6' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.fretboard .fretboard-note')).toHaveCount(18);
  // CAGED buttons still work alongside
  await page.getByRole('button', { name: '3 notes per string – from degree 6' }).click();
  await page.locator('.position-btn', { hasText: /^E$/ }).click();
  await expect(page.locator('.fretboard .fretboard-note').first()).toBeVisible();
});

test('lesson module: pick lesson, load preset (no playback), state + export settings restored after reload', async ({ page }) => {
  const preset = lessonPreset(2, 'cg7-jazz');
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-2').click();
  await expect(page.getByTestId('lesson-title')).toContainText('Lesson 2');
  await page.getByTestId('lesson-load-cg7-jazz').click();

  const checkLoaded = async () => {
    await expect(page.locator('.chord-bar-btn, .chord-bar-split')).toHaveCount(16);
    await expect(page.locator('.chord-bar-btn').first()).toContainText('C');
    await expect(page.getByRole('button', { name: `${preset.tempo} bpm` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();   // never auto-plays
  };
  await checkLoaded();
  await page.waitForTimeout(400);
  await page.reload();
  await checkLoaded();

  // Lesson selection is remembered too
  await page.getByTitle('Templates').click();
  await expect(page.getByTestId('lesson-btn-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('lesson-load-cg7-jazz')).toContainText('Loaded');
  await page.keyboard.press('Escape');
  await page.locator('.bp-chord-layer').click({ position: { x: 5, y: 5 } });

  // Live neck shows the lesson's first neck view
  await page.getByTitle('Fretboard').click();
  await expect(page.getByTestId('lf-shape')).toHaveValue('octave_134');
  await page.locator('.bp-chord-layer').click({ position: { x: 5, y: 5 } });

  // 🎬 dialog is pre-filled from the lesson data
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText(String(preset.export.repetitions));
  await expect(page.getByTestId('vx-rotateEvery')).toHaveText(String(preset.export.rotateEvery));
  // Mario, answer 2: octave positions 1-3-4 and 1-2-4 on two necks by default
  await expect(page.getByTestId('vx-necks')).toHaveValue('2');
  await expect(page.getByTestId('vx-view')).toHaveCount(2);
  await expect(page.getByTestId('vx-shape').nth(1)).toHaveValue('octave_124');
  await expect(page.getByTestId('vx-progress')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText(/Estimated length [5-9]:\d\d/);   // 5–10 minutes
  await page.getByRole('button', { name: 'Close' }).click();

  // A single-shape video version of the same preset (hybrid, one neck)
  await page.getByTitle('Templates').click();
  await page.getByTestId('lesson-variant-cg7-jazz-hybrid').click();
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-necks')).toHaveValue('1');
  await expect(page.getByTestId('vx-view')).toHaveCount(1);
  await expect(page.getByTestId('vx-shape')).toHaveValue('octave_hybrid');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('CAGED lesson presets default to all positions on two necks (C·G·D | A·E), full scale + pentatonic', async ({ page }) => {
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-4').click();
  await page.getByTestId('lesson-load-blues-Bbm').click();
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-necks')).toHaveValue('2');
  await expect(page.getByTestId('vx-shape').nth(0)).toHaveValue('caged_C,caged_G,caged_D');
  await expect(page.getByTestId('vx-shape').nth(1)).toHaveValue('caged_A,caged_E');
  await expect(page.getByTestId('vx-emphasis').first()).toBeChecked();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByTitle('Fretboard').click();
  await expect(page.getByTestId('lf-shape')).toHaveValue('caged_C,caged_G,caged_D');
});

test('export dialog: ≈10 min preset on a fast 4-bar vamp, too-long guard', async ({ page }) => {
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-1').click();
  await page.getByTestId('lesson-load-amg7-bossa').click();
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('95');           // ~8 min default (answer 9)
  await page.getByTestId('vx-len-10').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('119');
  await expect(page.getByRole('dialog')).toContainText('10:0');
  await expect(page.getByTestId('vx-start')).toBeEnabled();
  for (let i = 0; i < 70; i++) await page.getByRole('group', { name: 'repetitions' }).getByRole('button', { name: '+' }).click();
  await expect(page.getByTestId('vx-too-long')).toBeVisible();
  await expect(page.getByTestId('vx-start')).toBeDisabled();
});

test('lesson module in Hebrew: translated, layout stays LTR', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ear-training:language', 'he'));
  await page.goto('/backing-tracks');
  await page.locator('.bp-tab').last().click();
  await page.getByTestId('templates-tab-lessons').click();
  await expect(page.getByTestId('lesson-presets')).toContainText('אלתור בהישג יד');
  await expect(page.getByTestId('lesson-title')).toContainText('שיעור');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.lp-root')).direction)).toBe('ltr');
});
