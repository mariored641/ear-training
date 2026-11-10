import { test, expect } from '@playwright/test';

async function useLanguage(page, language) {
  await page.addInitScript((value) => {
    localStorage.setItem('ear-training:language', value);
  }, language);
}

async function xs(locator) {
  return locator.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
}

test('Hebrew keeps the English left-to-right layout', async ({ page }) => {
  await useLanguage(page, 'he');
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/positions');
  await expect(page.locator('.fret-number').nth(1)).toBeVisible();
  const dir = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
  }));
  expect(dir.lang).toBe('he');
  expect(dir.dir).toBe('ltr');

  const fretX = await xs(page.locator('.fret-numbers .fret-number'));
  expect(fretX.length).toBeGreaterThan(4);
  expect(fretX[0]).toBeLessThan(fretX[1]);
  expect(fretX[1]).toBeLessThan(fretX[2]);

  await page.goto('/backing-tracks');
  const chords = page.locator('.chord-bar-btn, .chord-bar-split');
  await expect(chords.first()).toBeVisible();
  const chordX = await xs(chords);
  expect(chordX[0]).toBeLessThan(chordX[1]);
  expect(chordX[1]).toBeLessThan(chordX[2]);

  const tabs = page.locator('button.bp-tab[title]');
  const tabCount = await tabs.count();
  let openedFretboard = false;
  for (let i = 0; i < tabCount; i += 1) {
    const title = await tabs.nth(i).getAttribute('title');
    if (title && /צוואר|fretboard/i.test(title)) {
      await tabs.nth(i).click();
      openedFretboard = true;
      break;
    }
  }
  expect(openedFretboard).toBe(true);
  await expect(page.locator('.asf-fret-num').nth(1)).toBeVisible();
  const neckX = await xs(page.locator('.asf-fret-numbers .asf-fret-num'));
  expect(neckX[0]).toBeLessThan(neckX[1]);
  expect(neckX[1]).toBeLessThan(neckX[2]);

  await page.goto('/exercise/4');
  await expect(page.locator('.rhythm-left-panel')).toBeVisible();
  const panels = await page.evaluate(() => {
    const left = document.querySelector('.rhythm-left-panel').getBoundingClientRect().x;
    const right = document.querySelector('.rhythm-right-panel').getBoundingClientRect().x;
    return { left, right };
  });
  expect(panels.left).toBeLessThan(panels.right);

  const word = page.locator('.tab-button').first();
  const order = await word.evaluate((el) => {
    const text = el.textContent || '';
    const start = text.search(/[\u0590-\u05FF]/);
    if (start < 0 || !el.firstChild) return null;
    const range = document.createRange();
    range.setStart(el.firstChild, start);
    range.setEnd(el.firstChild, start + 1);
    const first = range.getBoundingClientRect().x;
    range.setStart(el.firstChild, start + text.trim().length - 1);
    range.setEnd(el.firstChild, start + text.trim().length);
    const last = range.getBoundingClientRect().x;
    return { first, last, text };
  });
  expect(order).not.toBeNull();
  expect(order.first).toBeGreaterThan(order.last);
});

test('Hebrew and English put the same controls on the same side', async ({ browser }) => {
  async function geometry(language) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await useLanguage(page, language);
    await page.goto('/positions');
    await page.locator('.fret-number').nth(1).waitFor();
    const fret = await page.locator('.fret-numbers .fret-number').nth(1).evaluate((el) => Math.round(el.getBoundingClientRect().x));
    await page.goto('/');
    await page.locator('.satellite').first().waitFor();
    const satellites = await xs(page.locator('.satellite'));
    const switcher = await page.getByTestId('language-switcher').evaluate((el) => Math.round(el.getBoundingClientRect().x));
    await page.close();
    return { fret, satellites, switcher };
  }

  const hebrew = await geometry('he');
  const english = await geometry('en');
  expect(Math.abs(hebrew.fret - english.fret)).toBeLessThan(40);
  expect(hebrew.satellites.length).toBe(english.satellites.length);
  hebrew.satellites.forEach((x, index) => {
    expect(Math.abs(x - english.satellites[index])).toBeLessThan(8);
  });
  expect(hebrew.switcher).toBeGreaterThan(1000);
  expect(english.switcher).toBeGreaterThan(1000);
});

test('phone-sized Hebrew fretboard and chords still run left to right', async ({ page }) => {
  await useLanguage(page, 'he');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/positions');
  await expect(page.locator('.fret-number').nth(1)).toBeVisible();
  const fretX = await xs(page.locator('.fret-numbers .fret-number'));
  expect(fretX[0]).toBeLessThan(fretX[1]);

  await page.goto('/backing-tracks');
  const chords = page.locator('.chord-bar-btn, .chord-bar-split');
  await expect(chords.nth(1)).toBeVisible();
  const chordX = await xs(chords);
  expect(chordX[0]).toBeLessThan(chordX[1]);
});
