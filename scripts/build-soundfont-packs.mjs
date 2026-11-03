#!/usr/bin/env node
/**
 * build-soundfont-packs.mjs
 *
 * Builds the small SoundFont "packs" (one compressed SF3 per preset) that the
 * app streams on demand, instead of the original 356 MB JJazzLab SF2.
 *
 *   node scripts/build-soundfont-packs.mjs <path/to/JJazzLab-SoundFont.sf2> [--quality N] [--out dir]
 *   (the SF2 ships with JJazzLab, or: GitHub release assets-v1/JJazzLab-SoundFont.sf2)
 *
 * Output: public/soundfonts/packs-v1/<bank>-<program>.sf3 + manifest.json
 *
 * How it works:
 *   1. Parse the SF2 (RIFF: INFO / sdta / pdta "hydra").
 *   2. For every preset in PRESETS: copy the preset, the instruments it uses
 *      and the samples those instruments use (plus stereo-linked partners),
 *      remapping all indices so the result is a self-contained SoundFont.
 *   3. Encode every sample to mono Ogg Vorbis (ffmpeg + libvorbis) and write
 *      an SF3 file (ifil 3.1, sampleType |= 0x10, start/end = byte offsets
 *      into smpl, loop points relative to the sample start) — the format that
 *      FluidSynth reads when built with libsndfile.
 *
 * Requirements: ffmpeg with libvorbis on PATH.
 *
 * To add an instrument: add its [bank, program] to PRESETS, re-run, commit the
 * new .sf3 + manifest.json. If you change the encoding of existing packs, bump
 * PACKS_VERSION (new folder name → no stale HTTP/IndexedDB caches).
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const PACKS_VERSION = 'packs-v1'

// Vorbis quality (-q:a, 0–10) per pack. q5 is transparent for tonal
// instruments; cymbals / hi-hats are the most codec-sensitive → q7 for drums.
const DEFAULT_QUALITY = 5

// [bank, program, quality?] — every preset the app selects. Keep in sync with:
//   src/components/backing-tracks/useBackingTrackEngine.js  (channelProgramsForGenre / AMBIENT_GENRE_MAP)
//   src/constants/genreInstrumentMap.js                      (genre overrides)
//   src/components/ear-training/reactive/                    (SOUNDS + end bell)
//   src/lib/soundfont/SoundFontPlayer.js                     (DEFAULT_PRESETS, DRUM_KIT)
// A preset missing from the packs is skipped with a console warning.
const PRESETS = [
  // Pianos / keys
  [0, 0],    // Grand Piano          — CHORD1 default, PHRASE channel
  [0, 2],    // Electric Grand CP80  — rock piano
  [0, 4],    // E. Piano1 (Rhodes)   — blues / gospel / pop
  [0, 14],   // Tubular Bells        — reactive end-of-session bell
  // Guitars
  [0, 24],   // Nylon
  [0, 25],   // Steel
  [0, 26],   // Jazz
  [0, 27],   // Clean
  [0, 28],   // Muted
  [0, 29],   // Overdrive
  // Basses
  [0, 32],   // Acoustic
  [0, 33],   // Finger
  [0, 34],   // Pick
  [0, 36],   // Slap 1
  // Pads / sustained
  [0, 48],   // Strings              — PAD channel
  [0, 50],   // Synth Strings 1
  [0, 52],   // Choir Aahs
  [0, 89],   // Warm Pad
  // Drums
  [128, 0, 7], // Std Kit 1          — drum channel
]

// ─── RIFF helpers ────────────────────────────────────────────────────────────

function readChunks(buf, start, end) {
  const out = []
  let off = start
  while (off + 8 <= end) {
    const id = buf.toString('latin1', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    out.push({ id, data: off + 8, size })
    off += 8 + size + (size & 1)
  }
  return out
}

function chunk(id, payload) {
  const pad = payload.length & 1
  const head = Buffer.alloc(8)
  head.write(id, 0, 'latin1')
  head.writeUInt32LE(payload.length, 4)
  return Buffer.concat([head, payload, pad ? Buffer.alloc(1) : Buffer.alloc(0)])
}

function listChunk(type, children) {
  return chunk('LIST', Buffer.concat([Buffer.from(type, 'latin1'), ...children]))
}

// ─── SF2 parsing ─────────────────────────────────────────────────────────────

const REC = {
  phdr: 38, pbag: 4, pmod: 10, pgen: 4,
  inst: 22, ibag: 4, imod: 10, igen: 4,
  shdr: 46,
}

function parseSf2(file) {
  const buf = fs.readFileSync(file)
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'sfbk') {
    throw new Error(`${file} is not a SoundFont 2 file`)
  }
  const lists = {}
  for (const c of readChunks(buf, 12, buf.length)) {
    if (c.id !== 'LIST') continue
    const type = buf.toString('latin1', c.data, c.data + 4)
    lists[type] = {}
    for (const sub of readChunks(buf, c.data + 4, c.data + c.size)) lists[type][sub.id] = sub
  }
  if (lists.sdta.sm24) console.warn('[warn] sm24 (24-bit) data ignored — packs are 16-bit')

  const recs = (name) => {
    const { data, size } = lists.pdta[name]
    const n = REC[name]
    const arr = []
    for (let i = 0; i < size / n; i++) arr.push(buf.subarray(data + i * n, data + (i + 1) * n))
    return arr
  }
  const pdta = Object.fromEntries(Object.keys(REC).map(k => [k, recs(k)]))
  return { buf, lists, pdta }
}

const u16 = (b, o) => b.readUInt16LE(o)
const u32 = (b, o) => b.readUInt32LE(o)
const name20 = (b) => b.toString('latin1', 0, 20).replace(/\0.*$/s, '')

// ─── Subset + SF3 encode ─────────────────────────────────────────────────────

const GEN_INSTRUMENT = 41
const GEN_ATTENUATION = 48
const GEN_SAMPLE_ID = 53
const SAMPLE_TYPE_OGG = 0x10
const LINKED_TYPES = 0x2 | 0x4 | 0x8  // right | left | linked

function ffmpeg(args, input) {
  return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { input, maxBuffer: 1 << 30 })
}

function encodeVorbis(pcm, sampleRate, quality) {
  return ffmpeg([
    '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-c:a', 'libvorbis', '-q:a', String(quality),
    '-f', 'ogg', 'pipe:1',
  ], pcm)
}

/** Total PCM frames of an Ogg Vorbis stream = granule position of the last page */
function oggFrames(ogg) {
  const last = ogg.lastIndexOf(Buffer.from('OggS', 'latin1'))
  return Number(ogg.readBigInt64LE(last + 6))
}

/**
 * Decode an Ogg Vorbis buffer → { frames, peak } (peak = max |x|, 1.0 = full scale).
 * frames comes from the Ogg granule position (what libvorbisfile / libsndfile
 * honour); ffmpeg's decoder may emit a few hundred extra frames at the end, so
 * the peak is measured over the first `frames` samples only.
 */
function inspectVorbis(ogg) {
  const frames = oggFrames(ogg)
  const f32 = ffmpeg(['-i', 'pipe:0', '-f', 'f32le', '-ac', '1', 'pipe:1'], ogg)
  let peak = 0
  for (let i = 0; i < frames && (i + 1) * 4 <= f32.length; i++) {
    const v = Math.abs(f32.readFloatLE(i * 4))
    if (v > peak) peak = v
  }
  return { frames, peak }
}

/**
 * FluidSynth (2.4.x, libsndfile build) decodes SF3 samples with
 * SFC_SET_SCALE_FLOAT_INT_READ, which normalises every sample so that its
 * peak hits full scale. Quiet samples (soft velocity layers, cymbals …) would
 * therefore come out much louder than in the original SF2. We undo that gain
 * with extra initialAttenuation on every instrument zone that plays the
 * sample. FluidSynth applies amp = 10^(-cB/200), and multiplies the stored
 * generator value by EMU_ATTENUATION_FACTOR (0.4) on import
 * (fluid_defsfont.c), so the stored amount is cB / 0.4.
 */
const EMU_ATTENUATION_FACTOR = 0.4
function normalisationCompensation(peak) {
  if (!(peak > 0)) return 0
  const gain = 32767 / (peak * 32768)  // what libsndfile's short read applies
  return Math.max(0, Math.round((200 * Math.log10(gain)) / EMU_ATTENUATION_FACTOR))
}

const genRec = (oper, amount) => {
  const b = Buffer.alloc(4); b.writeUInt16LE(oper, 0); b.writeInt16LE(amount, 2); return b
}

function buildPack(sf, bank, program, quality) {
  const { buf, lists, pdta } = sf
  const { phdr, pbag, pmod, pgen, inst, ibag, imod, igen, shdr } = pdta

  const pi = phdr.findIndex((r, i) => i < phdr.length - 1 && u16(r, 20) === program && u16(r, 22) === bank)
  if (pi < 0) throw new Error(`Preset ${bank}:${program} not found`)

  const presetZones = []      // [{ gens: Buffer[], mods: Buffer[] }]
  const instruments = []      // [{ rec: Buffer, zones: [{ gens, mods }] }]
  const instMap = new Map()
  const sampleMap = new Map()
  const sampleOrder = []

  const addSample = (si) => {
    if (sampleMap.has(si)) return sampleMap.get(si)
    const ni = sampleOrder.length
    sampleMap.set(si, ni)
    sampleOrder.push(si)
    const type = u16(shdr[si], 44)
    if (type & 0x8000) throw new Error(`ROM sample ${si} not supported`)
    if (type & LINKED_TYPES) addSample(u16(shdr[si], 42))
    return ni
  }

  const addInstrument = (ii) => {
    if (instMap.has(ii)) return instMap.get(ii)
    const ni = instruments.length
    instMap.set(ii, ni)
    const entry = { rec: Buffer.from(inst[ii]), zones: [] }
    instruments.push(entry)
    for (let b = u16(inst[ii], 20); b < u16(inst[ii + 1], 20); b++) {
      const zone = { gens: [], mods: [] }
      for (let m = u16(ibag[b], 2); m < u16(ibag[b + 1], 2); m++) zone.mods.push(Buffer.from(imod[m]))
      for (let g = u16(ibag[b], 0); g < u16(ibag[b + 1], 0); g++) {
        const rec = Buffer.from(igen[g])
        if (u16(rec, 0) === GEN_SAMPLE_ID) rec.writeUInt16LE(addSample(u16(rec, 2)), 2)
        zone.gens.push(rec)
      }
      entry.zones.push(zone)
    }
    return ni
  }

  // Preset → instruments → samples
  for (let b = u16(phdr[pi], 24); b < u16(phdr[pi + 1], 24); b++) {
    const zone = { gens: [], mods: [] }
    for (let m = u16(pbag[b], 2); m < u16(pbag[b + 1], 2); m++) zone.mods.push(Buffer.from(pmod[m]))
    for (let g = u16(pbag[b], 0); g < u16(pbag[b + 1], 0); g++) {
      const rec = Buffer.from(pgen[g])
      if (u16(rec, 0) === GEN_INSTRUMENT) rec.writeUInt16LE(addInstrument(u16(rec, 2)), 2)
      zone.gens.push(rec)
    }
    presetZones.push(zone)
  }

  // Samples → Ogg Vorbis
  const smpl = lists.sdta.smpl
  const oggChunks = []
  const newShdr = []
  const compCb = []           // stored attenuation units, per new sample index
  let bytePos = 0
  let pcmBytes = 0
  for (const si of sampleOrder) {
    const r = shdr[si]
    const start = u32(r, 20), end = u32(r, 24), loopStart = u32(r, 28), loopEnd = u32(r, 32)
    const rate = u32(r, 36)
    if (end <= start) throw new Error(`Empty sample ${name20(r)}`)
    const pcm = buf.subarray(smpl.data + start * 2, smpl.data + end * 2)
    pcmBytes += pcm.length
    const ogg = encodeVorbis(pcm, rate, quality)
    const { frames, peak } = inspectVorbis(ogg)
    if (frames !== end - start) throw new Error(`Length mismatch for ${name20(r)}: ${frames} vs ${end - start}`)
    compCb.push(normalisationCompensation(peak))
    const rec = Buffer.from(r)
    rec.writeUInt32LE(bytePos, 20)
    rec.writeUInt32LE(bytePos + ogg.length, 24)
    rec.writeUInt32LE(Math.max(0, loopStart - start), 28)
    rec.writeUInt32LE(Math.max(0, loopEnd - start), 32)
    const type = u16(r, 44)
    rec.writeUInt16LE(type & LINKED_TYPES ? sampleMap.get(u16(r, 42)) : 0, 42)
    rec.writeUInt16LE(type | SAMPLE_TYPE_OGG, 44)
    newShdr.push(rec)
    oggChunks.push(ogg)
    bytePos += ogg.length
  }

  // Compensate the decoder's normalisation on each sample-playing instrument zone.
  // A local zone's attenuation *replaces* the instrument's global-zone value, so
  // start from local ?? global ?? 0.
  for (const instr of instruments) {
    const findAtten = (zone) => zone.gens.find(g => u16(g, 0) === GEN_ATTENUATION)
    const first = instr.zones[0]
    const globalZone = first && !first.gens.some(g => u16(g, 0) === GEN_SAMPLE_ID) ? first : null
    const globalAtten = globalZone && findAtten(globalZone) ? findAtten(globalZone).readInt16LE(2) : 0
    for (const zone of instr.zones) {
      const sid = zone.gens.find(g => u16(g, 0) === GEN_SAMPLE_ID)
      if (!sid) continue
      const comp = compCb[u16(sid, 2)]
      if (!comp) continue
      const atten = findAtten(zone)
      if (atten) atten.writeInt16LE(Math.min(1440, atten.readInt16LE(2) + comp), 2)
      else zone.gens.splice(zone.gens.indexOf(sid), 0, genRec(GEN_ATTENUATION, Math.min(1440, globalAtten + comp)))
    }
  }

  // Serialise the hydra
  const out = { phdr: [], pbag: [], pmod: [], pgen: [], inst: [], ibag: [], imod: [], igen: [] }
  const prec = Buffer.from(phdr[pi]); prec.writeUInt16LE(0, 24)
  out.phdr.push(prec)
  for (const z of presetZones) {
    out.pbag.push([out.pgen.length, out.pmod.length])
    out.pgen.push(...z.gens); out.pmod.push(...z.mods)
  }
  for (const instr of instruments) {
    instr.rec.writeUInt16LE(out.ibag.length, 20)
    out.inst.push(instr.rec)
    for (const z of instr.zones) {
      out.ibag.push([out.igen.length, out.imod.length])
      out.igen.push(...z.gens); out.imod.push(...z.mods)
    }
  }

  // Terminal records
  const eop = Buffer.alloc(38); eop.write('EOP', 0, 'latin1'); eop.writeUInt16LE(out.pbag.length, 24)
  out.phdr.push(eop)
  out.pbag.push([out.pgen.length, out.pmod.length])
  out.pmod.push(Buffer.alloc(10))
  out.pgen.push(Buffer.alloc(4))
  const eoi = Buffer.alloc(22); eoi.write('EOI', 0, 'latin1'); eoi.writeUInt16LE(out.ibag.length, 20)
  out.inst.push(eoi)
  out.ibag.push([out.igen.length, out.imod.length])
  out.imod.push(Buffer.alloc(10))
  out.igen.push(Buffer.alloc(4))
  const eos = Buffer.alloc(46); eos.write('EOS', 0, 'latin1')
  newShdr.push(eos)

  const bagBuf = (bags) => Buffer.concat(bags.map(([g, m]) => {
    const b = Buffer.alloc(4); b.writeUInt16LE(g, 0); b.writeUInt16LE(m, 2); return b
  }))

  // INFO: copy everything, but declare SoundFont version 3.1
  const infoChunks = []
  for (const [id, c] of Object.entries(lists.INFO)) {
    let payload = Buffer.from(buf.subarray(c.data, c.data + c.size))
    if (id === 'ifil') { payload = Buffer.alloc(4); payload.writeUInt16LE(3, 0); payload.writeUInt16LE(1, 2) }
    if (id === 'INAM') payload = Buffer.from(`${name20(phdr[pi])} (JJazzLab SF3)\0`, 'latin1')
    // FluidSynth requires even INFO sub-chunk sizes (zero-padded strings)
    if (payload.length & 1) payload = Buffer.concat([payload, Buffer.alloc(1)])
    infoChunks.push(chunk(id, payload))
  }

  const body = Buffer.concat([
    Buffer.from('sfbk', 'latin1'),
    listChunk('INFO', infoChunks),
    listChunk('sdta', [chunk('smpl', Buffer.concat(oggChunks))]),
    listChunk('pdta', [
      chunk('phdr', Buffer.concat(out.phdr)),
      chunk('pbag', bagBuf(out.pbag)),
      chunk('pmod', Buffer.concat(out.pmod)),
      chunk('pgen', Buffer.concat(out.pgen)),
      chunk('inst', Buffer.concat(out.inst)),
      chunk('ibag', bagBuf(out.ibag)),
      chunk('imod', Buffer.concat(out.imod)),
      chunk('igen', Buffer.concat(out.igen)),
      chunk('shdr', Buffer.concat(newShdr)),
    ]),
  ])
  const riff = Buffer.alloc(8)
  riff.write('RIFF', 0, 'latin1')
  riff.writeUInt32LE(body.length, 4)
  return {
    file: Buffer.concat([riff, body]),
    name: name20(phdr[pi]),
    samples: sampleOrder.length,
    pcmBytes,
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const src = args.find(a => !a.startsWith('--'))
  const qIdx = args.indexOf('--quality')
  const qualityOverride = qIdx >= 0 ? Number(args[qIdx + 1]) : null
  const outIdx = args.indexOf('--out')
  const outDir = outIdx >= 0
    ? path.resolve(args[outIdx + 1])
    : path.resolve(__dirname, '..', 'public', 'soundfonts', PACKS_VERSION)
  if (!src) {
    console.error('usage: node scripts/build-soundfont-packs.mjs <JJazzLab-SoundFont.sf2> [--quality N] [--out dir]')
    process.exit(1)
  }

  console.log(`Reading ${src} …`)
  const sf = parseSf2(src)
  fs.mkdirSync(outDir, { recursive: true })

  const manifest = { version: PACKS_VERSION, source: path.basename(src), packs: {} }
  let totalOut = 0, totalPcm = 0
  for (const [bank, program, presetQuality] of PRESETS) {
    const quality = qualityOverride ?? presetQuality ?? DEFAULT_QUALITY
    const t0 = Date.now()
    const pack = buildPack(sf, bank, program, quality)
    const file = `${String(bank).padStart(3, '0')}-${String(program).padStart(3, '0')}.sf3`
    fs.writeFileSync(path.join(outDir, file), pack.file)
    manifest.packs[`${bank}:${program}`] = { file, name: pack.name, bytes: pack.file.length, quality }
    totalOut += pack.file.length
    totalPcm += pack.pcmBytes
    console.log(
      `${bank}:${program}`.padEnd(8), pack.name.padEnd(20),
      `${pack.samples} samples`.padEnd(12),
      `${(pack.pcmBytes / 1e6).toFixed(2)} MB → ${(pack.file.length / 1e6).toFixed(2)} MB (q${quality})`,
      `(${Date.now() - t0} ms)`,
    )
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nTotal: ${(totalPcm / 1e6).toFixed(1)} MB PCM → ${(totalOut / 1e6).toFixed(2)} MB SF3 in ${outDir}`)
}

main()
