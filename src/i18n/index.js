import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import he from './locales/he';

export const LANGUAGE_STORAGE_KEY = 'ear-training:language';
export const SUPPORTED_LANGUAGES = ['he', 'en'];

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : null;
}

export function getInitialLanguage() {
  try {
    const stored = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (stored) return stored;
  } catch {}

  const browserLanguage = normalizeLanguage(navigator.languages?.[0] || navigator.language);
  return browserLanguage || 'he';
}

export function directionForLanguage(language) {
  return normalizeLanguage(language) === 'he' ? 'rtl' : 'ltr';
}

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: initialLanguage,
    // Each screen already supplies language-appropriate defaults for dynamic
    // musical content. Falling back from Hebrew to English would override
    // those defaults and create mixed-language labels.
    fallbackLng: false,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export function persistLanguage(language) {
  const normalized = normalizeLanguage(language) || 'he';
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {}
  return i18n.changeLanguage(normalized);
}

export default i18n;
