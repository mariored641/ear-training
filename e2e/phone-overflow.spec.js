import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
];

const ROUTES = [
  ['home', '/'],
  ['ear-training', '/category/ear-training'],
  ['ear-melodic', '/category/ear-training/melodic'],
  ['ear-harmonic', '/category/ear-training/harmonic-isolated'],
  ['ear-functional', '/category/ear-training/functional'],
  ['ear-voice', '/category/ear-training/voice-leading'],
  ['ear-solfege', '/category/ear-training/solfege'],
  ['ear-guitar', '/category/ear-training/guitar'],
  ['ear-reactive', '/category/ear-training/reactive'],
  ['M1', '/exercise/M1'],
  ['M2', '/exercise/M2'],
  ['M3', '/exercise/M3'],
  ['H1', '/exercise/H1'],
  ['H2', '/exercise/H2'],
  ['H3', '/exercise/H3'],
  ['H4', '/exercise/H4'],
  ['F0', '/exercise/F0'],
  ['F1', '/exercise/F1'],
  ['F2', '/exercise/F2'],
  ['F3', '/exercise/F3'],
  ['F4', '/exercise/F4'],
  ['V1', '/exercise/V1'],
  ['V2', '/exercise/V2'],
  ['S1', '/exercise/S1'],
  ['S2', '/exercise/S2'],
  ['G1', '/exercise/G1'],
  ['R1', '/exercise/R1'],
  ['R2', '/exercise/R2'],
  ['legacy-1', '/exercise/1'],
  ['legacy-2', '/exercise/2'],
  ['melodic-dictation', '/exercise/3'],
  ['legacy-4a', '/exercise/4a'],
  ['legacy-4b', '/exercise/4b'],
  ['legacy-4c', '/exercise/4c'],
  ['dictation', '/category/dictation'],
  ['feedback', '/feedback'],
  ['looper', '/looper'],
];

async function useLanguage(page, language) {
  await page.addInitScript((value) => {
    localStorage.setItem('ear-training:language', value);
  }, language);
}

async function fits(page, where) {
  const box = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    box.scrollWidth,
    `${where}: document scrollWidth ${box.scrollWidth} extends past innerWidth ${box.innerWidth}`,
  ).toBeLessThanOrEqual(box.innerWidth);
}

async function settle(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || '';
    return text.length > 20 && !text.includes('Loading…') && !text.includes('טוען…');
  }, null, { timeout: 15000 });
}

async function press(locator) {
  await locator.evaluate((el) => el.click());
}

async function eachTab(page, selector, where) {
  const tabs = page.locator(selector);
  const count = await tabs.count();
  expect(count, where).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await press(tabs.nth(i));
    await page.waitForTimeout(60);
    await fits(page, `${where} ${i}`);
  }
}

async function visitTools(page, label) {
  for (const [id, path] of ROUTES) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await fits(page, `${label} ${id}`);
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await press(page.locator('.gt-fab-main'));
  await fits(page, `${label} tools`);
  await press(page.locator('.gt-mini-metro'));
  await fits(page, `${label} metronome`);
  await page.keyboard.press('Escape');
  await press(page.locator('.gt-fab-main'));
  await press(page.locator('.gt-mini-tuner'));
  await fits(page, `${label} tuner`);
  await page.keyboard.press('Escape');

  await page.goto('/exercise/4', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await eachTab(page, '.tab-navigation .tab-button', `${label} rhythm`);

  await page.goto('/positions', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await eachTab(page, '.positions-tabs .tab-btn', `${label} positions`);

  await page.goto('/rhythm-training', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await eachTab(page, '.rt-tab', `${label} rhythm-training`);

  await page.goto('/feedback', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await eachTab(page, '.fb-tab', `${label} feedback`);

  await page.goto('/looper', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await press(page.locator('.looper-settings-btn'));
  await fits(page, `${label} looper settings`);
  await press(page.locator('.looper-modal-close'));

  await page.goto('/backing-tracks', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await fits(page, `${label} backing`);
  await press(page.locator('.bp-style-name'));
  await fits(page, `${label} backing styles`);
  await press(page.locator('.bp-style-name'));
  const info = page.locator('.bp-info-btn');
  for (let i = 0; i < await info.count(); i += 1) {
    await press(info.nth(i));
    await fits(page, `${label} backing info ${i}`);
    await press(info.nth(i));
  }
  const backingTabs = page.locator('.bp-tab:not(.bp-tab--play)');
  expect(await backingTabs.count()).toBeGreaterThan(0);
  for (let i = 0; i < await backingTabs.count(); i += 1) {
    await press(backingTabs.nth(i));
    await page.waitForTimeout(80);
    await fits(page, `${label} backing tab ${i}`);
    const sub = page.locator('.bp-templates-tab');
    for (let s = 0; s < await sub.count(); s += 1) {
      await press(sub.nth(s));
      await fits(page, `${label} backing templates ${s}`);
    }
  }
  await press(page.locator('.chord-bar-btn, .chord-bar-split').first());
  await fits(page, `${label} backing chord`);
}

for (const language of ['en', 'he']) {
  test(`phone pages stay within the viewport in ${language}`, async ({ page }) => {
    test.setTimeout(180000);
    await useLanguage(page, language);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await visitTools(page, `${language} ${viewport.width}`);
    }
    if (language === 'he') {
      expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');
    }
  });
}
