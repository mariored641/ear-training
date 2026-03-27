/**
 * parse-ireal.cjs
 * Reads the Jazz 1460 Standards irealb:// file, parses it with ireal-reader,
 * converts each song to the app's chord format, and writes jazz-standards.json.
 *
 * Run: node scripts/parse-ireal.cjs
 */

const fs   = require('fs')
const path = require('path')
const iRealReader = require('ireal-reader')

// ─── Paths ────────────────────────────────────────────────────────────────────

const INPUT  = 'C:/Users/DELL/Documents/Jazz 1460 Standards.txt'
const OUTPUT = path.join(__dirname, '../public/data/jazz-standards.json')

// ─── Time signature: ireal-reader returns numbers (44, 34, 64, 54, 24…) ──────

function parseTimeSignature(ts) {
  const n = String(ts || 44)
  switch (n) {
    case '34': return '3/4'
    case '44': return '4/4'
    case '54': return '5/4'
    case '64': return '6/4'
    case '24': return '2/4'
    case '68': return '6/8'
    case '98': return '9/8'
    default:   return '4/4'   // null / '12' (artifact) / unknown
  }
}

// ─── Tempo fallback by style name (all songs have bpm=0 in the file) ─────────

const STYLE_TEMPO = {
  // ── Swing ──
  'ballad':              60,
  'slow ballad':         55,
  'slow swing':          80,
  'medium slow swing':   110,
  'medium swing':        130,
  'medium up swing':     160,
  'up tempo swing':      200,
  'up swing':            200,
  'fast swing':          230,
  'bebop':               220,

  // ── Latin / Brazilian ──
  'bossa nova':          130,
  'samba':               160,
  'afro':                110,
  'afro cuban':          120,
  'latin':               140,
  'latin swing':         140,
  'bolero':              90,
  'cha cha':             130,
  'mambo':               160,

  // ── Waltz ──
  'waltz':               160,
  'jazz waltz':          160,
  'medium waltz':        150,

  // ── Funk / R&B / Rock ──
  'funk':                100,
  'r&b':                 85,
  'rock':                130,
  'even 8ths':           120,
  'even 16ths':          100,
  'groove':              100,

  // ── Misc ──
  'gospel':              80,
  'country':             120,
}

function guessTempoByStyle(style) {
  if (!style) return 120
  const s = style.toLowerCase().trim()
  // Exact match first
  if (STYLE_TEMPO[s] !== undefined) return STYLE_TEMPO[s]
  // Partial match
  for (const [key, bpm] of Object.entries(STYLE_TEMPO)) {
    if (s.includes(key)) return bpm
  }
  return 120
}

// ─── iReal chord string → app chord object ───────────────────────────────────

function parseRoot(str) {
  // Returns { root, rest }
  if (!str || str.length === 0) return { root: 'C', rest: '' }
  let i = 0
  let root = str[i++].toUpperCase()
  if (i < str.length && (str[i] === '#' || str[i] === 'b')) {
    root += str[i++]
  }
  return { root, rest: str.slice(i) }
}

function irealChordToApp(symbol) {
  if (!symbol || symbol === 'W' || symbol === 'x' || symbol === 'p' || symbol === 'n') {
    return null // rest / repeat / N.C.
  }

  symbol = symbol.trim()
  if (!symbol) return null

  // Slash chord — extract bass note
  let bassNote
  const slashIdx = symbol.lastIndexOf('/')
  let body = symbol
  if (slashIdx > 0) {
    const afterSlash = symbol.slice(slashIdx + 1)
    // Only treat as bass note if it looks like a note (letter + optional accidental)
    if (/^[A-Ga-g][b#]?$/.test(afterSlash)) {
      bassNote = afterSlash.charAt(0).toUpperCase() + afterSlash.slice(1)
      body = symbol.slice(0, slashIdx)
    }
  }

  const { root, rest } = parseRoot(body)
  let q = rest // quality string

  let quality    = 'major'
  let extensions = []

  // ── Minor ──
  if (q.startsWith('-') || q.startsWith('m')) {
    quality = 'minor'
    q = q.replace(/^[-m]/, '')

    if (q.startsWith('^7') || q.startsWith('maj7') || q.startsWith('M7')) {
      quality = 'minMaj7'
      q = q.replace(/^\^7|^maj7|^M7/, '')
    } else if (q.startsWith('7')) {
      extensions.push('7')
      q = q.slice(1)
    }
  }
  // ── Half-dim ──
  else if (q.startsWith('h7') || q.startsWith('ø7') || q.startsWith('m7b5') || q.startsWith('-7b5')) {
    quality = 'halfDim'
    q = ''
  }
  else if (q.startsWith('h') || q.startsWith('ø')) {
    quality = 'halfDim'
    q = q.replace(/^[hø]/, '')
  }
  // ── Diminished ──
  else if (q.startsWith('o') || q.startsWith('dim')) {
    quality = 'diminished'
    q = q.replace(/^o|^dim/, '')
    if (q.startsWith('7')) {
      extensions.push('7')
      q = q.slice(1)
    }
  }
  // ── Augmented ──
  else if (q.startsWith('+') || q.startsWith('aug')) {
    quality = 'augmented'
    q = q.replace(/^\+|^aug/, '')
    if (q.startsWith('7')) {
      extensions.push('7')
      q = q.slice(1)
    }
  }
  // ── Sus ──
  else if (q.startsWith('sus')) {
    q = q.slice(3)
    if (q.startsWith('2')) { quality = 'sus2'; q = q.slice(1) }
    else                    { quality = 'sus4'; q = q.replace(/^4?/, '') }
  }
  // ── Major (default) ──
  else {
    quality = 'major'
    // maj7 / ^7
    if (q.startsWith('^7') || q.startsWith('maj7') || q.startsWith('M7')) {
      extensions.push('maj7')
      q = q.replace(/^\^7|^maj7|^M7/, '')
    } else if (q.startsWith('^') && q.length === 1) {
      extensions.push('maj7')
      q = ''
    }
    // dominant 7
    else if (q.startsWith('7')) {
      extensions.push('7')
      q = q.slice(1)
    }
  }

  // ── Remaining extensions ──
  // Parse things like: b9, #9, 9, 11, #11, 13, b13, add9, 6, sus4 after a dom7
  const extPat = /(b9|#9|b13|#11|add9|add11|sus4|sus2|6\/9|6|9|11|13|alt)/g
  let m
  while ((m = extPat.exec(q)) !== null) {
    const e = m[1]
    if (e === 'alt') {
      // Altered: just keep 7, no extra extension (our engine handles 7alt as 7)
    } else if (e === 'sus4') {
      quality = 'sus4'
    } else if (e === 'sus2') {
      quality = 'sus2'
    } else if (e === '6/9' || e === '6') {
      // add9 / add6 — simplify to add9
      if (!extensions.includes('add9')) extensions.push('add9')
    } else if (e === '9' && !extensions.includes('9')) {
      if (!extensions.includes('maj7')) extensions.push('7') // 9 implies 7 for dominant
      extensions.push('9')
    } else if (e === '11' && !extensions.includes('11')) {
      extensions.push('11')
    } else if (e === '13' && !extensions.includes('13')) {
      extensions.push('13')
    } else if (!extensions.includes(e)) {
      extensions.push(e)
    }
  }

  // maj9 shorthand: if major + maj7 + 9, keep as is
  // m9 shorthand: minor + 7 + 9, keep as is

  const chord = { root, quality, extensions }
  if (bassNote) chord.bassNote = bassNote
  return chord
}

// ─── Convert ireal-reader measure array to app chords array ──────────────────
// Each measure = array of chord strings (1 or 2 chords)
// 1 chord → beats: 4 (full bar)
// 2 chords → beats: 2 each (half bar)

function measuresToChords(measures) {
  const chords = []
  for (const measure of measures) {
    if (!Array.isArray(measure) || measure.length === 0) {
      // Empty measure — use null to keep bar count right, fill with prev chord
      if (chords.length > 0) {
        const prev = chords[chords.length - 1]
        chords.push({ ...prev, extensions: [...(prev.extensions || [])] })
      } else {
        chords.push({ root: 'C', quality: 'major', extensions: [] })
      }
      continue
    }

    if (measure.length === 1) {
      const chord = irealChordToApp(measure[0])
      if (chord) {
        chords.push(chord) // beats defaults to 4 (full bar)
      } else if (chords.length > 0) {
        // Rest/repeat — reuse previous chord
        const prev = chords[chords.length - 1]
        chords.push({ ...prev, extensions: [...(prev.extensions || [])] })
      } else {
        chords.push({ root: 'C', quality: 'major', extensions: [] })
      }
    } else {
      // 2+ chords per measure → beats: 2 each
      const parsed = measure.slice(0, 2).map(s => irealChordToApp(s))
      const fallback = chords.length > 0 ? chords[chords.length - 1] : { root: 'C', quality: 'major', extensions: [] }
      for (const c of parsed) {
        const chord = c ?? { ...fallback, extensions: [...(fallback.extensions || [])] }
        chords.push({ ...chord, beats: 2 })
      }
    }
  }
  return chords
}

// ─── Normalize key ────────────────────────────────────────────────────────────

function normalizeKey(key) {
  if (!key) return { root: 'C', type: 'major' }
  const minor = key.endsWith('-') || key.endsWith('m')
  const root  = minor ? key.slice(0, -1) : key
  return { root: root || 'C', type: minor ? 'minor' : 'major' }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Reading input file…')
const raw = fs.readFileSync(INPUT, 'utf8').trim()

console.log('Parsing with ireal-reader…')
let playlist
try {
  playlist = iRealReader(raw)
} catch (e) {
  // Some versions wrap in an array
  console.error('Direct parse failed, trying alternatives:', e.message)
  process.exit(1)
}

console.log(`Playlist name: ${playlist.name}`)
console.log(`Songs found: ${playlist.songs.length}`)

const songs = []
let skipped = 0

for (const song of playlist.songs) {
  try {
    const measures = song.music?.measures
    if (!measures || measures.length === 0) { skipped++; continue }

    const chords = measuresToChords(measures)
    if (chords.length === 0) { skipped++; continue }

    const key = normalizeKey(song.key)
    const timeSignature = parseTimeSignature(song.music?.timeSignature)
    const tempo = (song.bpm && parseInt(song.bpm) > 0)
      ? parseInt(song.bpm)
      : guessTempoByStyle(song.style)

    songs.push({
      title:    song.title    || 'Unknown',
      composer: song.composer || '',
      style:    song.style    || '',
      key,
      timeSignature,
      tempo,
      chords,
      barCount: chords.length,
    })
  } catch (err) {
    console.warn(`Skipped "${song.title}": ${err.message}`)
    skipped++
  }
}

console.log(`Converted: ${songs.length} songs, skipped: ${skipped}`)

// ─── Ensure output directory ──────────────────────────────────────────────────

const outDir = path.dirname(OUTPUT)
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// ─── Write output ─────────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT, JSON.stringify(songs, null, 0), 'utf8')
const stat = fs.statSync(OUTPUT)
console.log(`Written to ${OUTPUT} (${(stat.size / 1024).toFixed(1)} KB)`)

// ─── Spot-check ───────────────────────────────────────────────────────────────

console.log('\nSpot-check (first 3 songs):')
songs.slice(0, 3).forEach(s => {
  console.log(`  "${s.title}" — ${s.key.root} ${s.key.type} — ${s.barCount} bars — chords[0]: ${JSON.stringify(s.chords[0])}`)
})
