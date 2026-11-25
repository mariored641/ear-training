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
  const preset = lessonPreset(2, 'cg7-easy-pop');
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-2').click();
  await expect(page.getByTestId('lesson-title')).toContainText('Lesson 2');
  await page.getByTestId('lesson-load-cg7-easy-pop').click();

  const checkLoaded = async () => {
    await expect(page.locator('.chord-bar-btn, .chord-bar-split')).toHaveCount(4);
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
  await expect(page.getByTestId('lesson-load-cg7-easy-pop')).toContainText('Loaded');
  await page.keyboard.press('Escape');
  await page.locator('.bp-chord-layer').click({ position: { x: 5, y: 5 } });

  // Live neck: ONE position (octave 1-3-4) with 3 round buttons, single-select
  await page.getByTitle('Fretboard').click();
  await expect(page.getByTestId('lf-positions').getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('lf-pos-octave_134')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('lf-shape')).toHaveCount(0);                 // extra settings folded away
  await page.getByTestId('lf-pos-octave_124').click();
  await expect(page.getByTestId('lf-pos-octave_124')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('lf-pos-octave_134')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('lf-more').click();
  await expect(page.getByTestId('lf-shape')).toHaveValue('octave_124');
  await page.getByTestId('lf-more').click();                                  // fold the settings back
  await expect(page.getByTestId('lf-shape')).toHaveCount(0);
  await page.getByTitle('Fretboard').click();                                 // tap again = close

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
  await page.getByTestId('lesson-video-cg7-easy-pop').click();
  await page.getByTestId('lesson-variant-cg7-easy-pop-hybrid').click();
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
  await expect(page.getByTestId('vx-emphasis').first()).toHaveValue('pentatonic');
  await page.getByRole('button', { name: 'Close' }).click();
  // …but the live neck shows ONE position, picked from 5 round buttons
  await page.getByTitle('Fretboard').click();
  const picker = page.getByTestId('lf-positions');
  await expect(picker.getByRole('button')).toHaveCount(5);
  await expect(picker.getByRole('button')).toHaveText(['C', 'A', 'G', 'E', 'D']);
  await expect(page.getByTestId('lf-pos-caged_C')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('lf-pos-caged_E').click();
  await expect(picker.locator('[aria-pressed=true]')).toHaveCount(1);
  await expect(page.getByTestId('lf-pos-caged_E')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('lf-more').click();
  await expect(page.getByTestId('lf-shape')).toHaveValue('caged_E');
});

test('lessons 1–3 are calm: 2 bars per chord and ≤ 100 BPM in the list', async ({ page }) => {
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  for (const n of [1, 2, 3]) {
    await page.getByTestId(`lesson-btn-${n}`).click();
    const metas = await page.locator('.lp-item-meta').allTextContents();
    expect(metas.length).toBeGreaterThan(4);
    for (const m of metas) expect(Number(/(\d+) bpm/.exec(m)[1])).toBeLessThanOrEqual(100);
    for (const c of await page.locator('.lp-item-chords').allTextContents()) expect(c).toMatch(/^(Am \| Am \| G7 \| G7|C \| C \| G7 \| G7)$/);
  }
});

test('export dialog: ≈10 min preset on a fast 4-bar vamp, too-long guard', async ({ page }) => {
  test.setTimeout(90000);   // 70 clicks on "+" alone take ~30 s
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-1').click();
  await page.getByTestId('lesson-btn-10').click();
  await page.getByTestId('lesson-load-amg7-bossa').click();
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('88');           // ~8 min default (answer 9)
  await page.getByTestId('vx-len-10').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('109');
  await expect(page.getByRole('dialog')).toContainText(/(9:5\d|10:0\d)/);
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

test('round 3: the live neck always shows the full scale with the arpeggio highlighted on top (lesson 6)', async ({ page }) => {
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-6').click();
  await page.getByTestId('lesson-load-amdmem-rock').click();
  await page.getByTitle('Fretboard').click();
  await expect(page.getByTestId('lf-pos-caged_G')).toHaveAttribute('aria-pressed', 'true');   // lesson text: G and E
  await page.getByTestId('lf-more').click();
  await expect(page.getByTestId('lf-emphasis')).toHaveValue('arpeggio');
  const neck = page.locator('.lf-panel');
  // Am chord on A minor, G position: chord tones ringed, the rest of the scale still drawn (softened).
  const active = neck.locator('.asf-note.active, .asf-note.root');
  const soft = neck.locator('.asf-note.soft');
  await expect(active.first()).toBeVisible();
  const nActive = await active.count();
  const nSoft = await soft.count();
  expect(nSoft).toBeGreaterThan(0);
  expect(nActive).toBeGreaterThan(nSoft);
  // Pentatonic highlight also keeps the full scale
  await page.getByTestId('lf-emphasis').selectOption('pentatonic');
  await expect(neck.locator('.asf-note.soft').first()).toBeVisible();
  await page.getByTitle('Fretboard').click();                                 // tap again = close
  await page.getByTestId('open-video-export').click();
  await expect(page.getByTestId('vx-emphasis').first()).toHaveValue('arpeggio');
  await expect(page.locator('[data-testid=vx-view] select').first()).toHaveValue('aeolian');
});

test('round 3: with no scale chosen the live neck still shows the key scale (never chord tones alone)', async ({ page }) => {
  await page.goto('/backing-tracks');
  await page.getByTitle('Fretboard').click();
  await page.locator('.lf-panel select.lf-select').nth(1).selectOption('');
  const scaleNotes = page.locator('.lf-panel .asf-note.active, .lf-panel .asf-note.root');
  // a 7-note key scale over the whole neck shows dozens of notes
  await expect(scaleNotes.nth(30)).toBeAttached();
});
