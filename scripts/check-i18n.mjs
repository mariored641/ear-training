/**
 * Fails when a translation key used by the app is missing in English or Hebrew,
 * or when the two locale trees disagree (Hebrew plural "_two" is allowed alone).
 *
 *   node scripts/check-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import en from '../src/i18n/locales/en.js';
import he from '../src/i18n/locales/he.js';
import { SCALE_CATEGORIES, CHORD_CATEGORIES } from '../src/constants/allScalesData.js';
import { SCALE_HEBREW_NAMES } from '../src/constants/scaleQualities.js';
import { DIVISION_OPTIONS } from '../src/constants/exercise4Defaults.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, next, out);
    else out[next] = value;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(js|jsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

function present(flat, key) {
  if (typeof flat[key] === 'string') return true;
  return typeof flat[`${key}_one`] === 'string' && typeof flat[`${key}_other`] === 'string';
}

export function checkI18n() {
  const problems = [];
  const english = flatten(en);
  const hebrew = flatten(he);

  const onlyEnglish = Object.keys(english).filter((key) => !(key in hebrew));
  const onlyHebrew = Object.keys(hebrew).filter((key) => !(key in english) && !key.endsWith('_two'));
  for (const key of onlyEnglish) problems.push(`missing in Hebrew: ${key}`);
  for (const key of onlyHebrew) problems.push(`missing in English: ${key}`);

  const staticKeys = new Set();
  const call = /(?:i18n\.t|(?<![\w.])t)\(\s*['"]([A-Za-z0-9_.]+)['"]/g;
  for (const file of walk(path.join(ROOT, 'src'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(call)) staticKeys.add(match[1]);
  }

  for (const key of staticKeys) {
    if (!present(english, key)) problems.push(`used key missing in English: ${key}`);
    if (!present(hebrew, key)) problems.push(`used key missing in Hebrew: ${key}`);
  }

  const styleIds = [];
  const engine = fs.readFileSync(path.join(ROOT, 'src/components/backing-tracks/useBackingTrackEngine.js'), 'utf8');
  const catalog = engine.slice(engine.indexOf('export const GENRE_CATALOG'), engine.indexOf('const GENRE_STYLES'));
  for (const match of catalog.matchAll(/id:\s*'([^']+)'/g)) styleIds.push(match[1]);

  const required = [
    ...styleIds.map((id) => `backing.styles.${id}`),
    ...[...SCALE_CATEGORIES, ...CHORD_CATEGORIES].map((category) => `positions.musicCategories.${category.id}`),
    ...[...SCALE_CATEGORIES, ...CHORD_CATEGORIES].flatMap((category) => (
      category.items.map((item) => `positions.musicItems.${item.id}`)
    )),
    ...Object.keys(SCALE_HEBREW_NAMES).map((id) => `music.scales.${id}`),
    ...DIVISION_OPTIONS.map((option) => `rhythm.divisions.${option.value}`),
  ];
  for (const key of required) {
    if (!present(english, key)) problems.push(`catalog key missing in English: ${key}`);
    if (!present(hebrew, key)) problems.push(`catalog key missing in Hebrew: ${key}`);
  }

  return problems;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  const problems = checkI18n();
  if (problems.length) {
    console.error(problems.join('\n'));
    console.error(`\n${problems.length} i18n problem(s)`);
    process.exit(1);
  }
  console.log('i18n keys match');
}
