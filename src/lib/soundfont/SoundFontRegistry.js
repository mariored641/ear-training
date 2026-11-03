/**
 * SoundFontRegistry.js
 * רשימת ספריות ה-SoundFont הזמינות.
 *
 * ── ברירת המחדל: JJazzLab "packs" ──────────────────────────────────────────
 * במקום קובץ SF2 אחד של 356MB, כל כלי (preset) הוא קובץ SF3 קטן ודחוס
 * (Ogg Vorbis) ב-public/soundfonts/packs-v1/, ונטען רק כשצריך אותו.
 * ג'אז טיפוסי = ~10MB בהורדה ראשונה, ואחר כך הכל מה-IndexedDB.
 * נבנה ע"י: node scripts/build-soundfont-packs.mjs <JJazzLab-SoundFont.sf2>
 * אפשר להפנות למקור אחר (CDN) עם VITE_SF_PACKS_URL.
 *
 * ── ספריות SF2 מלאות ───────────────────────────────────────────────────────
 * רק לדשבורד ההשוואה הנסתר /test/sf2-lab. URLs נקראים מ-import.meta.env.
 * ספרייה בלי URL תוצג כ-"URL not configured".
 */

export const PACKS_VERSION = 'packs-v1'

const JJAZZLAB_FULL_SF2 = '/soundfonts/JJazzLab-SoundFont.sf2'

export const SOUNDFONT_LIBRARIES = [
  {
    id: 'jjazzlab',
    type: 'packs',
    name: 'JJazzLab (SF3 packs)',
    size: '~3MB per instrument, on demand',
    baseUrl: (import.meta.env.VITE_SF_PACKS_URL || `/soundfonts/${PACKS_VERSION}`).replace(/\/$/, ''),
    cacheKey: `sf3-jjazzlab-${PACKS_VERSION}`,
    notes: 'ברירת המחדל של האפליקציה — JJazzLab דחוס, נטען לפי כלי.',
  },
  {
    id: 'jjazzlab-full',
    name: 'JJazzLab (full SF2)',
    size: '~356MB',
    url: import.meta.env.VITE_SF2_URL_JJAZZLAB || JJAZZLAB_FULL_SF2,
    fallbackUrl: JJAZZLAB_FULL_SF2,
    cacheKey: 'sf2-jjazzlab-full-v1',
    notes: 'המקור הלא-דחוס (להשוואת A/B בלבד — כבד מאוד).',
  },
  {
    id: 'fluidr3',
    name: 'FluidR3 GM',
    size: '~141MB',
    url: import.meta.env.VITE_SF2_URL_FLUIDR3 || '',
    cacheKey: 'sf2-fluidr3-full-v2',
    notes: 'הסטנדרט החינמי של עולם ה-MIDI. GM מלא, מאוזן.',
  },
  {
    id: 'generaluser',
    name: 'GeneralUser GS',
    size: '~32MB',
    url: import.meta.env.VITE_SF2_URL_GENERALUSER || '',
    cacheKey: 'sf2-generaluser-v1',
    notes: 'קומפקטי ומלוטש. יחס איכות/גודל מצוין.',
  },
  {
    id: 'arachno',
    name: 'Antares GM',
    size: '~46MB',
    url: import.meta.env.VITE_SF2_URL_ARACHNO || '',
    cacheKey: 'sf2-antares-v2',
    notes: 'GM כללי באיכות גבוהה, פסנתרים ומיתרים בולטים.',
  },
]

export const DEFAULT_LIBRARY_ID = 'jjazzlab'

/** IndexedDB keys of retired caches — deleted on startup to free users' disk space */
export const LEGACY_CACHE_KEYS = ['sf2-jjazzlab-v1']

export function getLibraryById(id) {
  return SOUNDFONT_LIBRARIES.find(lib => lib.id === id) || null
}

export function getDefaultLibrary() {
  return getLibraryById(DEFAULT_LIBRARY_ID)
}

export function isPackLibrary(lib) {
  return lib?.type === 'packs'
}

export function isLibraryAvailable(lib) {
  return !!(lib && (isPackLibrary(lib) ? lib.baseUrl : lib.url))
}
