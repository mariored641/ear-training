/**
 * SoundFontRegistry.js
 * רשימת ספריות ה-SF2 הזמינות להשוואה בדשבורד /test/sf2-lab.
 *
 * URLs נקראים מ-import.meta.env (Vite). ספרייה בלי URL מוגדר תוצג
 * בדשבורד עם סטטוס "URL not configured" — לא תהיה ניתנת לטעינה
 * עד שתעלה לוסרוסל Blob ויתווסף VITE_SF2_URL_<ID> ב-.env.local.
 *
 * הוספת ספרייה חדשה:
 *   1. הוסף לרשימה למטה
 *   2. הוסף VITE_SF2_URL_<NEWID> ל-.env.local אחרי שהקובץ הועלה ל-Blob
 */

const JJAZZLAB_FALLBACK = '/soundfonts/JJazzLab-SoundFont.sf2'

export const SOUNDFONT_LIBRARIES = [
  {
    id: 'jjazzlab',
    name: 'JJazzLab',
    size: '~70MB',
    url: import.meta.env.VITE_SF2_URL_JJAZZLAB || import.meta.env.VITE_SF2_URL || JJAZZLAB_FALLBACK,
    cacheKey: 'sf2-jjazzlab-v1',
    notes: 'הברירת מחדל הנוכחית של האפליקציה. כיוון לג׳אז.',
  },
  {
    id: 'fluidr3',
    name: 'FluidR3 Mono',
    size: '~24MB',
    url: import.meta.env.VITE_SF2_URL_FLUIDR3 || '',
    cacheKey: 'sf2-fluidr3-v1',
    notes: 'גרסת Mono של FluidR3 הקלאסי (SF3 דחוס). 24MB, נשמע טוב כברירת מחדל.',
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
    name: 'LibreArachno',
    size: '~9MB',
    url: import.meta.env.VITE_SF2_URL_ARACHNO || '',
    cacheKey: 'sf2-arachno-v1',
    notes: 'גרסה libre של Arachno המקורי (CC0). קטן וייחודי.',
  },
]

export const DEFAULT_LIBRARY_ID = 'jjazzlab'

export function getLibraryById(id) {
  return SOUNDFONT_LIBRARIES.find(lib => lib.id === id) || null
}

export function getDefaultLibrary() {
  return getLibraryById(DEFAULT_LIBRARY_ID)
}

export function isLibraryAvailable(lib) {
  return !!(lib && lib.url)
}
