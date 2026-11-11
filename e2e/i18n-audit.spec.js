import { test, expect } from '@playwright/test';
import fs from 'fs';
import { checkI18n } from '../scripts/check-i18n.mjs';

const OUT = process.env.T5_SCREEN_DIR || '/workspace/codex-night-11-12/screens';
fs.mkdirSync(OUT, { recursive: true });

const RAW_KEY = /\b[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+\b/g;

function rawKeys(text) {
  return [...new Set(
    [...text.matchAll(RAW_KEY)]
      .map((match) => match[0])
      .filter((key) => !key.endsWith('.app') && !key.includes('vercel') && !key.startsWith('www.'))
  )];
}

async function useLanguage(page, language) {
  await page.addInitScript((lang) => {
    localStorage.setItem('ear-training:language', lang);
    const style = document.createElement('style');
    style.textContent = '[data-testid="language-switcher"]{pointer-events:none !important}';
    document.documentElement.appendChild(style);
  }, language);
}

async function settle(page) {
  await page.addStyleTag({
    content: '[data-testid="language-switcher"]{pointer-events:none !important}',
  });
  await page.waitForFunction(() => {
    const text = document.body?.innerText?.trim() || '';
    return text.length > 8 && !text.startsWith('טוען') && !text.startsWith('Loading');
  }, null, { timeout: 20000 });
}

async function surfaceText(page) {
  return page.evaluate(() => {
    const bits = [document.body.innerText];
    document.querySelectorAll('[aria-label],[title],[placeholder],option').forEach((el) => {
      for (const attr of ['aria-label', 'title', 'placeholder']) {
        const value = el.getAttribute(attr);
        if (value) bits.push(value);
      }
      if (el.tagName === 'OPTION') bits.push(el.textContent || '');
    });
    return bits.join('\n');
  });
}

async function assertNoRawKeys(page, where) {
  const keys = rawKeys(await surfaceText(page));
  expect(keys, `${where}: ${keys.join(', ')}`).toEqual([]);
}

const ROUTES = [
  '/',
  '/category/ear-training',
  '/category/ear-training/melodic',
  '/category/ear-training/harmonic-isolated',
  '/category/ear-training/functional',
  '/category/ear-training/voice-leading',
  '/category/ear-training/solfege',
  '/category/ear-training/guitar',
  '/category/ear-training/reactive',
  '/exercise/M1',
  '/exercise/M2',
  '/exercise/M3',
  '/exercise/H1',
  '/exercise/H2',
  '/exercise/H3',
  '/exercise/H4',
  '/exercise/F0',
  '/exercise/F1',
  '/exercise/F2',
  '/exercise/F3',
  '/exercise/F4',
  '/exercise/V1',
  '/exercise/V2',
  '/exercise/S1',
  '/exercise/S2',
  '/exercise/G1',
  '/exercise/R1',
  '/exercise/R2',
  '/exercise/1',
  '/exercise/2',
  '/exercise/3',
  '/exercise/4a',
  '/exercise/4b',
  '/exercise/4c',
  '/category/dictation',
  '/rhythm-training',
  '/feedback',
  '/looper',
];

test('used translation keys exist in English and Hebrew', () => {
  expect(checkI18n()).toEqual([]);
});

for (const language of ['en', 'he']) {
  test(`no raw translation keys in ${language}`, async ({ page }) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await useLanguage(page, language);

    for (const route of ROUTES) {
      await page.goto(route);
      await settle(page);
      if (route === '/exercise/M1') {
        await page.locator('.et-header-level-trigger').click();
        await page.locator('.et-level-drawer').waitFor({ state: 'visible' });
      }
      if (route === '/looper') {
        await page.locator('.looper-settings-btn').evaluate((el) => el.click());
      }
      await assertNoRawKeys(page, route);
      if (language === 'he' && ['/', '/category/ear-training', '/exercise/3', '/rhythm-training', '/feedback', '/looper'].includes(route)) {
        const name = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');
        await page.screenshot({ path: `${OUT}/i18n-he-${name}.png` });
      }
      if (route === '/exercise/M1') {
        await page.locator('.et-level-drawer-close').evaluate((el) => el.click());
      }
      if (route === '/looper') {
        await page.locator('.looper-modal-close').evaluate((el) => el.click());
      }
    }

    await page.goto('/exercise/4');
    await settle(page);
    const rhythmTabs = page.locator('.tab-navigation .tab-button');
    for (let i = 0; i < await rhythmTabs.count(); i += 1) {
      await rhythmTabs.nth(i).click();
      await assertNoRawKeys(page, `rhythm tab ${i}`);
    }
    await page.locator('.tab-navigation .tab-button').nth(2).click();
    await expect(page.locator('.division-select').first()).toContainText(language === 'he' ? 'שמיניות' : 'Eighths');
    await assertNoRawKeys(page, 'advanced subdivisions');
    if (language === 'he') await page.screenshot({ path: `${OUT}/i18n-he-rhythm-advanced.png` });
    await page.locator('.tab-navigation .tab-button').nth(0).click();
    await expect(page.locator('.beat-label').first()).toContainText(language === 'he' ? 'פעמה 1' : 'Beat 1');
    if (language === 'he') await page.screenshot({ path: `${OUT}/i18n-he-rhythm.png` });

    await page.goto('/positions');
    await settle(page);
    const positionTabs = page.locator('.positions-tabs .tab-btn');
    for (let i = 0; i < await positionTabs.count(); i += 1) {
      await positionTabs.nth(i).click();
      await assertNoRawKeys(page, `positions tab ${i}`);
    }
    await positionTabs.nth(2).click();
    await page.locator('.ast-mode-btn').filter({ hasText: /^A$/ }).evaluate((el) => el.click());
    await expect(page.getByText(language === 'he' ? 'שמות' : 'Names', { exact: true })).toBeVisible();
    await positionTabs.nth(3).click();
    const show = page.locator('.pct-display-toggle');
    await expect(show).toContainText(language === 'he' ? 'מספרים' : 'Numbers');
    await expect(show).not.toContainText('positions.');
    await page.locator('.pct-presets .pct-add-btn').click();
    await expect(page.locator('.pct-preset-name')).toBeVisible();
    await assertNoRawKeys(page, 'partial chords');
    if (language === 'he') {
      await page.screenshot({ path: `${OUT}/i18n-he-partial-chords.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${OUT}/i18n-he-partial-chords-phone.png` });
      await page.setViewportSize({ width: 1280, height: 900 });
    }

    await page.goto('/backing-tracks');
    await settle(page);
    await page.locator('.bp-style-name').click();
    await expect(page.locator('.bp-genre-item').first()).toBeVisible();
    await assertNoRawKeys(page, 'backing styles');
    await page.locator('.bp-style-name').click();
    const backingTabs = page.locator('.bp-tab:not(.bp-tab--play)');
    for (let i = 0; i < await backingTabs.count(); i += 1) {
      await backingTabs.nth(i).click();
      await assertNoRawKeys(page, `backing tab ${i}`);
    }
    if (language === 'he') await page.screenshot({ path: `${OUT}/i18n-he-backing.png` });

    await page.goto('/');
    await settle(page);
    await page.locator('.gt-fab-main').click();
    await page.locator('.gt-mini-metro').click();
    await expect(page.locator('.gt-metro')).toBeVisible();
    await assertNoRawKeys(page, 'metronome');
  });
}
