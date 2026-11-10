import { test, expect } from '@playwright/test';

/** WCAG contrast of an element's used text color against its used background. */
async function controlContrast(locator) {
  return locator.evaluate((el) => {
    const parse = (value) => {
      const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return null;
      return { r: +match[1], g: +match[2], b: +match[3], a: match[4] === undefined ? 1 : +match[4] };
    };
    const channel = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = (rgb) => 0.2126 * channel(rgb.r / 255) + 0.7152 * channel(rgb.g / 255) + 0.0722 * channel(rgb.b / 255);
    const ratio = (fg, bg) => {
      if (!fg || !bg || fg.a < 0.4 || bg.a < 0.4) return null;
      const lighter = Math.max(lum(fg), lum(bg));
      const darker = Math.min(lum(fg), lum(bg));
      return (lighter + 0.05) / (darker + 0.05);
    };
    const style = getComputedStyle(el);
    const options = el.tagName === 'SELECT'
      ? [...el.options].map((option) => {
          const optionStyle = getComputedStyle(option);
          return ratio(parse(optionStyle.color), parse(optionStyle.backgroundColor));
        })
      : [];
    return {
      contrast: ratio(parse(style.color), parse(style.backgroundColor)),
      options,
      scheme: style.colorScheme,
    };
  });
}

test('rhythm division menus and length fields stay readable', async ({ page }) => {
  await page.goto('/exercise/4');
  await page.locator('.tab-button').nth(2).click();

  await expect(page.locator('select.division-select').first()).toBeVisible();
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme).toBe('dark');

  const selects = page.locator('select.division-select');
  for (let i = 0; i < await selects.count(); i += 1) {
    const result = await controlContrast(selects.nth(i));
    expect(result.contrast).toBeGreaterThan(7);
    expect(result.scheme).toBe('dark');
    expect(result.options.length).toBeGreaterThan(1);
    for (const optionContrast of result.options) {
      expect(optionContrast).toBeGreaterThan(7);
    }
  }

  const lengths = page.locator('input.length-input');
  expect(await lengths.count()).toBeGreaterThan(0);
  for (let i = 0; i < await lengths.count(); i += 1) {
    const result = await controlContrast(lengths.nth(i));
    expect(result.contrast).toBeGreaterThan(7);
  }
});

test('other section menus keep readable option lists', async ({ page }) => {
  await page.goto('/exercise/3');
  const dictation = page.locator('select.ex3-select');
  await expect(dictation.first()).toBeVisible();
  expect(await dictation.count()).toBeGreaterThan(0);
  for (let i = 0; i < await dictation.count(); i += 1) {
    const result = await controlContrast(dictation.nth(i));
    expect(result.contrast).toBeGreaterThan(4.5);
    for (const optionContrast of result.options) expect(optionContrast).toBeGreaterThan(4.5);
  }

  await page.goto('/positions');
  const root = page.locator('select.root-select');
  await expect(root).toBeVisible();
  const rootResult = await controlContrast(root);
  for (const optionContrast of rootResult.options) expect(optionContrast).toBeGreaterThan(7);

  await page.goto('/exercise/4b');
  const settingsButton = page.getByRole('button', { name: /הגדרות|settings/i });
  await expect(settingsButton).toBeVisible();
  await settingsButton.click();
  const library = page.locator('select.select-input');
  await expect(library).toBeVisible();
  const libraryResult = await controlContrast(library);
  expect(libraryResult.scheme).toBe('light');
  expect(libraryResult.contrast).toBeGreaterThan(7);
  for (const optionContrast of libraryResult.options) expect(optionContrast).toBeGreaterThan(7);

  const titleInk = await page.locator('.settings-section-title').first().evaluate((el) => {
    const color = getComputedStyle(el).color;
    let node = el.parentElement;
    let background = 'transparent';
    while (node) {
      const value = getComputedStyle(node).backgroundColor;
      if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
        background = value;
        break;
      }
      node = node.parentElement;
    }
    return { color, background };
  });
  expect(titleInk.color).toBe('rgb(26, 19, 10)');
  expect(titleInk.background).toBe('rgb(255, 255, 255)');
});

test('rhythm division menu stays readable on a phone-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/exercise/4');
  await page.locator('.tab-button').nth(2).click();
  const result = await controlContrast(page.locator('select.division-select').first());
  expect(result.contrast).toBeGreaterThan(7);
  for (const optionContrast of result.options) expect(optionContrast).toBeGreaterThan(7);
});
