#!/usr/bin/env node
/**
 * upload-sf2-libraries.mjs — One-shot upload of SF2 libraries to Vercel Blob.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> node scripts/upload-sf2-libraries.mjs <dir>
 *
 * Expects files in <dir>:
 *   - FluidR3Mono_GM.sf3
 *   - GeneralUser-GS.sf2
 *   - LibreArachno.sf2
 *
 * Outputs the resulting public URLs as env-var lines you can paste into .env.local.
 */
import { put } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_DIR = process.argv[2]
if (!SOURCE_DIR) {
  console.error('Usage: node scripts/upload-sf2-libraries.mjs <dir-with-sf2-files>')
  process.exit(1)
}

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN
if (!TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN env var')
  process.exit(1)
}

const FILES = [
  { local: 'FluidR3Mono_GM.sf3',  remote: 'FluidR3Mono_GM.sf3',  envVar: 'VITE_SF2_URL_FLUIDR3' },
  { local: 'GeneralUser-GS.sf2',  remote: 'GeneralUser-GS.sf2',  envVar: 'VITE_SF2_URL_GENERALUSER' },
  { local: 'LibreArachno.sf2',    remote: 'LibreArachno.sf2',    envVar: 'VITE_SF2_URL_ARACHNO' },
]

const results = []

for (const file of FILES) {
  const fullPath = path.join(SOURCE_DIR, file.local)
  console.log(`Uploading ${file.local} → ${file.remote} ...`)
  const buffer = await readFile(fullPath)
  const blob = await put(file.remote, buffer, {
    access: 'public',
    token: TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
  })
  console.log(`  ✓ ${blob.url}`)
  results.push({ envVar: file.envVar, url: blob.url })
}

console.log('\n=== env-var lines to paste into .env.local ===\n')
for (const r of results) {
  console.log(`${r.envVar}="${r.url}"`)
}
