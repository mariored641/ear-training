/**
 * StyleLoader.js — Load native-JSON style files from public/styles-native/.
 *
 * Replaces the old `fetch(.sty).then(parseSty)` runtime path. The JSON files
 * are byte-equivalent to what `parseSty()` produced (see scripts/sty-to-native.mjs
 * + scripts/verify-native-parity.mjs for the guarantee).
 *
 * Production code paths should call `loadStyleById(id)` where `id` matches an
 * entry id in `useBackingTrackEngine.js`'s GENRE_CATALOG. File-upload UI paths
 * (where the user pulls an arbitrary .sty from their disk) still go through
 * `parseSty` in `StyleParser.js` — this loader is for shipped presets only.
 */

const INDEX_URL = '/styles-native/index.json'

let indexPromise = null

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — ${INDEX_URL}`)
        return r.json()
      })
      .catch(err => {
        // Allow retry on transient failures
        indexPromise = null
        throw err
      })
  }
  return indexPromise
}

export async function loadStyleByPath(relativePath) {
  const url = `/styles-native/${relativePath}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json()
}

export async function loadStyleById(id) {
  const idx = await loadIndex()
  const entry = idx.styles.find(s => s.id === id)
  if (!entry) throw new Error(`Unknown style id: ${id}`)
  return loadStyleByPath(entry.path)
}
