#!/usr/bin/env node
/**
 * sty-to-native.mjs — Convert Yamaha .sty files to our native JSON format.
 *
 * The native JSON is a 1:1 mirror of what `parseSty(buf)` returns at runtime,
 * after the in-parser post-passes (`tameHighChordNotes`, `applyStyleSpecificFixes`)
 * have already run. Loading the JSON yields a byte-equivalent style object,
 * so `BackingTrackEngine.setStyle(json)` behaves identically to before.
 *
 * Usage:
 *   node scripts/sty-to-native.mjs <input.sty> [--category <cat>] [--id <id>]
 *   node scripts/sty-to-native.mjs --catalog        ← convert all 46 catalog entries
 *   node scripts/sty-to-native.mjs --catalog --dry-run
 *
 * Catalog mode reads the GENRE_CATALOG in src/components/backing-tracks/useBackingTrackEngine.js,
 * resolves each `sty:` path against several search roots (public/styles/ first, then JJazzLab
 * dev-server middleware roots), converts what it finds, skips with a warning what it can't.
 *
 * Output: public/styles-native/<category>/<id>.json + public/styles-native/index.json
 */

import fs                from 'node:fs'
import path              from 'node:path'
import { createHash }    from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { parseSty }      from '../src/lib/style-engine/StyleParser.js'

// ─── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..')
const NATIVE_DIR = path.join(REPO_ROOT, 'public', 'styles-native')
const CATALOG_FILE = path.join(REPO_ROOT, 'src', 'components', 'backing-tracks', 'useBackingTrackEngine.js')

// Possible source roots for the /styles/* and /styles-appdata/* URLs.
// Ordered: in-repo first, then JJazzLab install paths (laptop), then desktop fallbacks.
const STYLES_ROOTS = [
  // Files already shipped under the repo
  path.join(REPO_ROOT, 'public', 'styles'),
  // JJazzLab install (laptop convention from vite.config.js)
  'C:/Users/DELL/JJazzLab/Rhythms',
  // Desktop convention if the user has JJazzLab here
  'C:/Users/user/JJazzLab/Rhythms',
  process.env.JJAZZLAB_STYLES_DIR || '',
].filter(Boolean)

const APPDATA_ROOTS = [
  // In case anyone stashes them in the repo
  path.join(REPO_ROOT, 'public', 'styles-appdata'),
  // JJazzLab AppData (laptop)
  'C:/Users/DELL/AppData/Roaming/jjazzlab/5.1/.jjazz/Default',
  // Desktop
  'C:/Users/user/AppData/Roaming/jjazzlab/5.1/.jjazz/Default',
  process.env.JJAZZLAB_APPDATA_DIR || '',
].filter(Boolean)

// ─── CLI parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isCatalog = args.includes('--catalog')
const isDryRun  = args.includes('--dry-run')
const verbose   = args.includes('-v') || args.includes('--verbose')

function flagValue(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function resolveStyUrl(url) {
  // url examples:
  //   /styles/Swing&Jazz/LACoolSwing.STY
  //   /styles-appdata/Yamaha/Jazzvocal.s264.sty
  const decoded = decodeURIComponent(url)
  let relative, roots
  if (decoded.startsWith('/styles-appdata/')) {
    relative = decoded.slice('/styles-appdata/'.length)
    roots = APPDATA_ROOTS
  } else if (decoded.startsWith('/styles/')) {
    relative = decoded.slice('/styles/'.length)
    roots = STYLES_ROOTS
  } else if (path.isAbsolute(decoded)) {
    // Already a filesystem path
    return fs.existsSync(decoded) ? decoded : null
  } else {
    relative = decoded
    roots = STYLES_ROOTS
  }
  for (const root of roots) {
    const candidate = path.join(root, relative)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function readCatalog() {
  // Parse GENRE_CATALOG out of useBackingTrackEngine.js with regex.
  // The catalog file is human-edited but the entry format is stable.
  const src = fs.readFileSync(CATALOG_FILE, 'utf8')

  // Find each top-level category block first
  // Pattern: { category: 'jazz', label: '...', icon: '...', subtypes: [ ... ] }
  const catBlockRe = /\{\s*category:\s*'([^']+)'[\s\S]*?subtypes:\s*\[([\s\S]*?)\]\s*,?\s*\}/g
  const catalog = []
  let m
  while ((m = catBlockRe.exec(src)) !== null) {
    const category = m[1]
    const subBlock = m[2]
    // Each subtype: { id: '...', label: '...', bpm: NN, sty: '...', human: '...' }
    // Labels/sty paths may use single OR double quotes (entries with apostrophes
    // in the label, like "Mr Mac's Blues", must use double quotes).
    // Ambient subtypes omit `sty:` — we tolerate that.
    const subRe = /\{\s*id:\s*(['"])([^'"]+)\1\s*,\s*label:\s*(['"])((?:(?!\3).)*)\3\s*,\s*bpm:\s*(\d+)\s*(?:,\s*sty:\s*(['"])((?:(?!\6).)*)\6)?[^}]*\}/g
    let sm
    while ((sm = subRe.exec(subBlock)) !== null) {
      catalog.push({
        category,
        id: sm[2],
        label: sm[4],
        bpm: parseInt(sm[5], 10),
        styUrl: sm[7] || null,
      })
    }
  }
  return catalog
}

function deterministic(obj) {
  // Pass parseSty's output through a JSON round-trip so that any `undefined`
  // values become absent keys — this guarantees the on-disk JSON is bit-equal
  // to what `JSON.parse(JSON.stringify(parseSty(buf)))` produces at runtime,
  // which is exactly what the parity gate compares.
  return JSON.parse(JSON.stringify(obj))
}

function partList(style) {
  return Object.keys(style.parts || {})
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

// ─── Single-file converter ────────────────────────────────────────────────────

function convertOne({ srcPath, category, id, label, dryRun }) {
  const buf = fs.readFileSync(srcPath)
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const style = parseSty(arr)
  const normalized = deterministic(style)

  const outDir  = path.join(NATIVE_DIR, category)
  const outFile = path.join(outDir, `${id}.json`)
  const relPath = `${category}/${id}.json`

  if (!dryRun) {
    ensureDir(outDir)
    fs.writeFileSync(outFile, JSON.stringify(normalized, null, 2))
  }

  return {
    id,
    label,
    category,
    path: relPath,
    name: normalized.name,
    tempo: normalized.tempo,
    timeSignature: normalized.timeSignature,
    sffType: normalized.sffType,
    division: normalized.division,
    parts: partList(normalized),
    sourceSty: srcPath.replace(/\\/g, '/'),
    sha256OfSource: sha256(buf),
  }
}

// ─── Catalog mode ─────────────────────────────────────────────────────────────

function runCatalog({ dryRun }) {
  const catalog = readCatalog()
  if (catalog.length === 0) {
    console.error('ERROR: failed to parse GENRE_CATALOG — regex matched 0 entries.')
    process.exit(2)
  }
  console.log(`Catalog: ${catalog.length} entries parsed.`)

  const indexEntries = []
  const skipped = []

  for (const entry of catalog) {
    if (!entry.styUrl) {
      // Ambient (no .sty) — fine, not part of the migration.
      if (verbose) console.log(`  skip (no sty url): ${entry.id}`)
      continue
    }
    const srcPath = resolveStyUrl(entry.styUrl)
    if (!srcPath) {
      console.warn(`  ⚠ NOT FOUND: ${entry.id}  (${entry.styUrl})`)
      skipped.push({ id: entry.id, reason: 'source-not-found', url: entry.styUrl })
      continue
    }
    try {
      const meta = convertOne({
        srcPath,
        category: entry.category,
        id: entry.id,
        label: entry.label,
        dryRun,
      })
      indexEntries.push(meta)
      console.log(`  ✓ ${entry.id.padEnd(22)} ← ${path.basename(srcPath)}  (parts=${meta.parts.length})`)
    } catch (err) {
      console.error(`  ✗ ${entry.id}  ${err.message}`)
      skipped.push({ id: entry.id, reason: 'parse-error', url: entry.styUrl, error: err.message })
    }
  }

  // Write index.json
  const indexFile = path.join(NATIVE_DIR, 'index.json')
  const index = {
    generatedAt: new Date().toISOString(),
    repoCommit: process.env.GIT_SHA || null,
    catalogTotal: catalog.length,
    converted: indexEntries.length,
    skipped,
    styles: indexEntries.sort((a, b) => a.id.localeCompare(b.id)),
  }
  if (!dryRun) {
    ensureDir(NATIVE_DIR)
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2))
  }

  console.log('')
  console.log(`Converted: ${indexEntries.length} / ${catalog.length} catalog entries`)
  if (skipped.length > 0) {
    console.log(`Skipped:   ${skipped.length}`)
    for (const s of skipped) console.log(`  - ${s.id}  (${s.reason})  ${s.url}`)
  }
  if (dryRun) console.log('(dry run — no files written)')
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

if (isCatalog) {
  runCatalog({ dryRun: isDryRun })
} else {
  const input = args.find(a => !a.startsWith('-') && a !== flagValue('--category') && a !== flagValue('--id'))
  if (!input) {
    console.error('Usage: node scripts/sty-to-native.mjs <input.sty> [--category <cat>] [--id <id>]')
    console.error('       node scripts/sty-to-native.mjs --catalog [--dry-run]')
    process.exit(1)
  }
  const category = flagValue('--category') || 'misc'
  const baseName = path.basename(input).replace(/\.(sty|STY|prs|sst|bcs|s\d+|S\d+|T\d+|t\d+)+$/, '')
  const id = flagValue('--id') || baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const meta = convertOne({
    srcPath: path.resolve(input),
    category,
    id,
    label: baseName,
    dryRun: isDryRun,
  })
  console.log(JSON.stringify(meta, null, 2))
  if (isDryRun) console.log('(dry run — no files written)')
}
