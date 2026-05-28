#!/usr/bin/env node
/**
 * verify-native-parity.mjs — Assert that public/styles-native/<*.json> is
 * byte-equivalent to re-parsing the original .sty file via StyleParser.
 *
 * For each entry in public/styles-native/index.json:
 *   1. Load the JSON.
 *   2. Re-read the source .sty (path is in the manifest's sourceSty field).
 *   3. parseSty(buf) → normalize via JSON round-trip → deepStrictEqual.
 *
 * If 46/46 match, the engine cannot tell the JSON path apart from the .sty path.
 *
 * Usage:
 *   node scripts/verify-native-parity.mjs --all
 *   node scripts/verify-native-parity.mjs jazz_cool
 */

import fs                from 'node:fs'
import path              from 'node:path'
import assert            from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { parseSty }      from '../src/lib/style-engine/StyleParser.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..')
const NATIVE_DIR = path.join(REPO_ROOT, 'public', 'styles-native')
const INDEX_FILE = path.join(NATIVE_DIR, 'index.json')

function normalize(obj) {
  // Same normalization the converter applies — round-trip strips undefined keys.
  return JSON.parse(JSON.stringify(obj))
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function verifyOne(entry) {
  const jsonPath = path.join(NATIVE_DIR, entry.path)
  const srcPath  = entry.sourceSty
  if (!fs.existsSync(jsonPath)) return { id: entry.id, ok: false, reason: 'json-missing' }
  if (!fs.existsSync(srcPath))  return { id: entry.id, ok: false, reason: 'source-missing' }

  const stored = loadJson(jsonPath)
  const buf    = fs.readFileSync(srcPath)
  const arr    = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const reparsed = normalize(parseSty(arr))

  try {
    assert.deepStrictEqual(stored, reparsed)
    return { id: entry.id, ok: true }
  } catch (err) {
    return { id: entry.id, ok: false, reason: 'mismatch', detail: err.message.split('\n').slice(0, 5).join('\n') }
  }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
if (!fs.existsSync(INDEX_FILE)) {
  console.error(`ERROR: ${INDEX_FILE} not found. Run sty-to-native.mjs --catalog first.`)
  process.exit(2)
}

const index = loadJson(INDEX_FILE)
const all   = args.includes('--all')
const ids   = all ? index.styles.map(s => s.id) : args.filter(a => !a.startsWith('-'))

const targets = index.styles.filter(s => ids.includes(s.id) || all)
if (targets.length === 0) {
  console.error(`ERROR: no matching entries. Available ids: ${index.styles.map(s => s.id).join(', ')}`)
  process.exit(1)
}

let pass = 0, fail = 0
const failures = []
for (const t of targets) {
  const r = verifyOne(t)
  if (r.ok) {
    pass++
    console.log(`  ✓ ${r.id}`)
  } else {
    fail++
    failures.push(r)
    console.log(`  ✗ ${r.id}  (${r.reason})`)
    if (r.detail) console.log(`      ${r.detail.split('\n').join('\n      ')}`)
  }
}

console.log('')
console.log(`Parity: ${pass}/${targets.length} PASS, ${fail} FAIL`)
if (fail > 0) process.exit(1)
