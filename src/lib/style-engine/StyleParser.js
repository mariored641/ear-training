/**
 * StyleParser.js — Yamaha .sty file parser
 *
 * Converts a .sty binary file (ArrayBuffer) to structured JSON.
 * Based on JJazzLab's CASMDataReader.java, MPL_MiscData.java, MPL_MusicData.java
 *
 * Usage:
 *   import { parseSty } from './StyleParser'
 *   const style = await parseSty(arrayBuffer)
 *
 * Output structure: see JJAZZLAB_ENGINE_SPEC.md → שלב 2
 */

// ─── Constants ────────────────────────────────────────────────────────────────

// StylePart canonical names as they appear in the .sty file (MIDI markers + Sdec)
const STYLE_PART_NAMES = [
  'Intro A', 'Intro B', 'Intro C', 'Intro D',
  'Main A',  'Main B',  'Main C',  'Main D',
  'Fill In AA', 'Fill In BB', 'Fill In CC', 'Fill In DD',
  'Fill In BA', 'Fill In AB',
  'Ending A', 'Ending B', 'Ending C', 'Ending D',
]

// AccType names by MIDI channel (channel 8 → index 0)
const ACC_TYPES = ['SUBRHYTHM', 'RHYTHM', 'BASS', 'CHORD1', 'CHORD2', 'PAD', 'PHRASE1', 'PHRASE2']

// YamChord list — ORDER IS CRITICAL (matches Yamaha byte encoding index 0-33)
export const YAM_CHORDS = [
  '1+2+5',     // 0
  'sus4',      // 1
  '1+5',       // 2
  '1+8',       // 3
  '7aug',      // 4
  'Maj7aug',   // 5
  '7(#9)',     // 6
  '7(b13)',    // 7
  '7(b9)',     // 8
  '7(13)',     // 9
  '7#11',      // 10
  '7(9)',      // 11
  '7b5',       // 12
  '7sus4',     // 13
  '7th',       // 14
  'dim7',      // 15
  'dim',       // 16
  'minMaj7(9)',// 17
  'minMaj7',   // 18
  'min7(11)',  // 19
  'min7(9)',   // 20
  'min(9)',    // 21
  'm7b5',      // 22
  'min7',      // 23
  'min6',      // 24
  'min',       // 25
  'aug',       // 26
  'Maj6(9)',   // 27
  'Maj7(9)',   // 28
  'Maj(9)',    // 29
  'Maj7#11',   // 30
  'Maj7',      // 31
  'Maj6',      // 32
  'Maj',       // 33
]

// NTR (Note Transposition Rule): 0=ROOT_TRANSPOSITION, 1=ROOT_FIXED, 2=GUITAR
const NTR_NAMES = ['ROOT_TRANSPOSITION', 'ROOT_FIXED', 'GUITAR']

// NTT (Note Transposition Table): indices 0-10 for non-GUITAR, 11-13 for GUITAR
const NTT_NAMES = [
  'BYPASS',           // 0
  'MELODY',           // 1
  'CHORD',            // 2
  'MELODIC_MINOR',    // 3
  'MELODIC_MINOR_5',  // 4
  'HARMONIC_MINOR',   // 5
  'HARMONIC_MINOR_5', // 6
  'NATURAL_MINOR',    // 7
  'NATURAL_MINOR_5',  // 8
  'DORIAN',           // 9
  'DORIAN_5',         // 10
  'ALL_PURPOSE',      // 11 (GUITAR only)
  'STROKE',           // 12 (GUITAR only)
  'ARPEGGIO',         // 13 (GUITAR only)
]

// RTR (Retrigger Rule): 0-5
const RTR_NAMES = [
  'STOP', 'PITCH_SHIFT', 'PITCH_SHIFT_TO_ROOT',
  'RETRIGGER', 'RETRIGGER_TO_ROOT', 'NOTE_GENERATOR',
]

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Parse a Yamaha .sty file from an ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @returns {Object} Parsed style object
 */
export function parseSty(buffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let pos = 0

  // ── 1. MIDI Header ──────────────────────────────────────────────────────────
  const hdrTag = readAscii(bytes, pos, 4); pos += 4
  if (hdrTag !== 'MThd') throw new Error(`Expected MThd, got: ${hdrTag}`)

  const hdrSize = readUInt32(view, pos); pos += 4
  if (hdrSize !== 6) throw new Error(`Unexpected MIDI header size: ${hdrSize}`)

  pos += 2 // format (always 0)
  pos += 2 // num tracks (always 1)
  const ticksPerQuarter = readUInt16(view, pos); pos += 2

  // ── 2. Locate MIDI Track (save offset, skip for now) ────────────────────────
  const trkTag = readAscii(bytes, pos, 4); pos += 4
  if (trkTag !== 'MTrk') throw new Error(`Expected MTrk, got: ${trkTag}`)

  const trackSize = readUInt32(view, pos); pos += 4
  const trackStart = pos         // save: we'll parse notes AFTER CASM
  const trackEnd = pos + trackSize
  pos = trackEnd                 // skip track body for now

  // ── 3. CASM Section — parse FIRST to create StyleParts ───────────────────────
  // (CASMDataReader.java does the same: skip MTrk, then parse CASM)
  const casmPos = findCasm(bytes, pos)
  if (casmPos === -1) throw new Error('CASM section not found in .sty file')

  const style = {
    name: '',
    tempo: 120,
    timeSignature: '4/4',
    ticksPerQuarter,
    sffType: 'SFF1',
    division: 'BINARY',
    parts: {},    // populated by CASM, then notes filled by MIDI track
    _ctabs: {},   // channel → ctab (for MIDI note assignment)
  }

  pos = casmPos + 4 // skip 'CASM'
  const casmSize = readUInt32(view, pos); pos += 4
  const casmEnd = pos + casmSize
  parseCasm(bytes, view, pos, casmEnd, style)

  // ── 4. MIDI Track — parse AFTER CASM (parts now exist) ───────────────────────
  parseMidiTrack(bytes, view, trackStart, trackEnd, ticksPerQuarter, style)

  // ── 5. Clean up internal state ───────────────────────────────────────────────
  delete style._ctabs

  return style
}

// ─── CASM Parser ─────────────────────────────────────────────────────────────

function parseCasm(bytes, view, pos, end, style) {
  // CASM = one or more CSEG sections
  while (pos < end) {
    const tag = readAscii(bytes, pos, 4); pos += 4
    if (tag !== 'CSEG') throw new Error(`Expected CSEG, got: ${tag} at pos ${pos - 4}`)

    const size = readUInt32(view, pos); pos += 4
    const csegEnd = pos + size

    parseCseg(bytes, view, pos, csegEnd, style)
    pos = csegEnd
  }
}

function parseCseg(bytes, view, pos, end, style) {
  // CSEG = Sdec + one or more Ctab/Ctb2 + optional Cntt sections

  // ── Sdec section ────────────────────────────────────────────────────────────
  const sdecTag = readAscii(bytes, pos, 4); pos += 4
  if (sdecTag !== 'Sdec') throw new Error(`Expected Sdec, got: ${sdecTag}`)

  const sdecSize = readUInt32(view, pos); pos += 4
  const sdecStr = readAscii(bytes, pos, sdecSize).trim(); pos += sdecSize

  // Parse comma-separated part names: "Main A,Main B,Intro A"
  const partNames = sdecStr.split(/\s*,\s*/).filter(Boolean)
  const impactedParts = []
  for (const name of partNames) {
    if (!STYLE_PART_NAMES.includes(name)) {
      throw new Error(`Unknown StylePart name in Sdec: "${name}"`)
    }
    const key = name.replace(/ /g, '_')
    if (!style.parts[key]) {
      style.parts[key] = { type: key, sizeInBeats: 0, channels: {} }
    }
    impactedParts.push(key)
  }

  // ── Ctab / Ctb2 / Cntt sections ─────────────────────────────────────────────
  while (pos < end) {
    const sectionTag = readAscii(bytes, pos, 4); pos += 4
    const sectionSize = readUInt32(view, pos); pos += 4
    const sectionEnd = pos + sectionSize

    if (sectionTag === 'Ctab') {
      style.sffType = 'SFF1'
      const ctab = parseCtabSection(bytes, view, pos, 'SFF1')
      for (const partKey of impactedParts) {
        style.parts[partKey].channels[ctab.srcChannel] = { ctab, notes: [] }
        style._ctabs[ctab.srcChannel] = ctab
      }
    } else if (sectionTag === 'Ctb2') {
      style.sffType = 'SFF2'
      const ctab = parseCtb2Section(bytes, view, pos, 'SFF2')
      for (const partKey of impactedParts) {
        style.parts[partKey].channels[ctab.srcChannel] = { ctab, notes: [] }
        style._ctabs[ctab.srcChannel] = ctab
      }
    } else if (sectionTag === 'Cntt') {
      const cntt = parseCntt(bytes, view, pos, style.sffType)
      for (const partKey of impactedParts) {
        const ch = style.parts[partKey].channels[cntt.channel]
        if (ch) {
          ch.ctab.ctb2Main.ntt = cntt.ntt
          ch.ctab.ctb2Main.bassOn = cntt.bassOn
        }
      }
    } else {
      throw new Error(`Unknown CSEG section: "${sectionTag}"`)
    }

    pos = sectionEnd
  }
}

// ─── Ctab Parsers ─────────────────────────────────────────────────────────────

/** Parse SFF1 Ctab section. Returns ctab object. */
function parseCtabSection(bytes, view, pos, sffType) {
  const { ctab, bytesRead } = parseCtabFirstPart(bytes, view, pos)
  pos += bytesRead

  ctab.ctb2Main = parseCtb2Subpart(view, pos, sffType)
  pos += 6

  // Special feature byte (for extra drum voice, rarely used)
  const special = view.getUint8(pos)
  // If non-zero, 4 more bytes follow — we just skip (not used)
  // pos += 1; if (special !== 0) pos += 4  ← not needed since sectionEnd handles it

  return ctab
}

/** Parse SFF2 Ctb2 section. Returns ctab object. */
function parseCtb2Section(bytes, view, pos, sffType) {
  const { ctab, bytesRead } = parseCtabFirstPart(bytes, view, pos)
  pos += bytesRead

  // Middle range pitch boundaries
  const middleLowPitch = view.getUint8(pos++)
  const middleHighPitch = view.getUint8(pos++)

  ctab.ctb2MiddleLowPitch = middleLowPitch
  ctab.ctb2MiddleHighPitch = middleHighPitch

  // Parse Low, Main, High subparts (6 bytes each)
  ctab.ctb2Low = middleLowPitch > 0 ? parseCtb2Subpart(view, pos, sffType) : null
  pos += 6
  ctab.ctb2Main = parseCtb2Subpart(view, pos, sffType)
  pos += 6
  ctab.ctb2High = middleHighPitch < 127 ? parseCtb2Subpart(view, pos, sffType) : null
  pos += 6
  // Skip 7 unknown bytes at end of Ctb2 section (handled by sectionEnd)

  return ctab
}

/** Parse common first part shared by Ctab and Ctb2 structures. */
function parseCtabFirstPart(bytes, view, pos) {
  let p = pos

  const srcChannel = view.getUint8(p++)
  const name = readAscii(bytes, p, 8).replace(/\0/g, '').trim(); p += 8
  const destChannel = view.getUint8(p++)

  if (destChannel < 8 || destChannel > 15) {
    throw new Error(`Invalid dest channel in Ctab: ${destChannel}`)
  }
  const accType = ACC_TYPES[destChannel - 8]

  const editable = view.getUint8(p++) === 0

  // Muted notes: 2 bytes → bitfield for pitches 11–0
  const mnB1 = view.getUint8(p++)
  const mnB2 = view.getUint8(p++)
  const mutedNotes = parseMutedNotes(mnB1, mnB2)

  // Muted chords: 5 bytes → bitfield for YamChord indices 0–33
  const mcB1 = view.getUint8(p++)
  const mcB2 = view.getUint8(p++)
  const mcB3 = view.getUint8(p++)
  const mcB4 = view.getUint8(p++)
  const mcB5 = view.getUint8(p++)
  const { mutedChords, autoStart } = parseMutedChords(mcB1, mcB2, mcB3, mcB4, mcB5)

  // Source chord note (pitch class 0-11)
  const sourceChordNote = view.getUint8(p++)

  // Source chord type (0-0x22)
  const srcChordTypeByte = view.getUint8(p++)
  const sourceChordType = srcChordTypeByte === 0x22
    ? YAM_CHORDS[2]          // fallback: '1+5'
    : YAM_CHORDS[0x21 - srcChordTypeByte]

  return {
    ctab: {
      srcChannel,
      name,
      accType,
      editable,
      mutedNotes,
      mutedChords,
      autoStart,
      sourceChordNote,
      sourceChordType,
      ctb2Low: null,
      ctb2Main: null,
      ctb2High: null,
    },
    bytesRead: p - pos,
  }
}

/** Parse a 6-byte Ctb2 subpart. */
function parseCtb2Subpart(view, pos, sffType) {
  const ntrByte = view.getUint8(pos)
  if (ntrByte > 2) throw new Error(`Invalid NTR: ${ntrByte}`)
  const ntr = NTR_NAMES[ntrByte]

  const nttByte = view.getUint8(pos + 1)
  let bassOn = (nttByte & 0x80) !== 0
  let nttIndex = nttByte & 0x7F

  if (ntr === 'GUITAR') {
    if (nttIndex >= 3) throw new Error(`Invalid NTT for GUITAR: ${nttIndex}`)
    nttIndex += 11 // ALL_PURPOSE=11, STROKE=12, ARPEGGIO=13
  } else {
    if (nttIndex >= 11) throw new Error(`Invalid NTT: ${nttIndex}`)
    if (sffType === 'SFF1') {
      if (nttIndex === 3) {
        // SFF1 BASS → SFF2: MELODY + bassOn
        bassOn = true
        nttIndex = 1
      } else if (nttIndex === 4) {
        nttIndex = 3 // MELODIC_MINOR
      }
    }
  }
  const ntt = NTT_NAMES[nttIndex]

  const chordRootUpperLimit = view.getUint8(pos + 2)
  const noteLowLimit = view.getUint8(pos + 3)
  const noteHighLimit = view.getUint8(pos + 4)

  const rtrByte = view.getUint8(pos + 5)
  if (rtrByte > 5) throw new Error(`Invalid RTR: ${rtrByte}`)
  const rtr = RTR_NAMES[rtrByte]

  return { ntr, ntt, bassOn, chordRootUpperLimit, noteLowLimit, noteHighLimit, rtr }
}

/** Parse Cntt section (channel + ntt override). */
function parseCntt(bytes, view, pos, sffType) {
  const channel = view.getUint8(pos)
  const nttByte = view.getUint8(pos + 1)
  const bassOn = (nttByte & 0x80) !== 0
  let nttIndex = nttByte & 0x7F
  if (nttIndex >= NTT_NAMES.length) throw new Error(`Invalid Cntt NTT: ${nttIndex}`)
  const ntt = NTT_NAMES[nttIndex]
  return { channel, ntt, bassOn }
}

// ─── Muted Notes / Chords Decoders ────────────────────────────────────────────

/**
 * b1 bits 3–0 → pitches 11–8
 * b2 bits 7–0 → pitches 7–0
 * bit = 0 means MUTED
 */
function parseMutedNotes(b1, b2) {
  const muted = []
  const pairs = [
    [b1 & 8, 11], [b1 & 4, 10], [b1 & 2, 9], [b1 & 1, 8],
    [b2 & 128, 7], [b2 & 64, 6], [b2 & 32, 5], [b2 & 16, 4],
    [b2 & 8, 3],  [b2 & 4, 2],  [b2 & 2, 1],  [b2 & 1, 0],
  ]
  for (const [flag, pitch] of pairs) {
    if (!flag) muted.push(pitch)
  }
  return muted
}

/**
 * Bit = 0 means MUTED for that chord index.
 * b1 bit2 = autoStart, b1 bits 1–0 → chords 0–1
 * b2 bits 7–0 → chords 2–9, b3 → 10–17, b4 → 18–25, b5 → 26–33
 */
function parseMutedChords(b1, b2, b3, b4, b5) {
  const autoStart = (b1 & 4) !== 0
  const mutedChords = []
  const bits = [
    b1 & 2, b1 & 1,
    b2 & 128, b2 & 64, b2 & 32, b2 & 16, b2 & 8, b2 & 4, b2 & 2, b2 & 1,
    b3 & 128, b3 & 64, b3 & 32, b3 & 16, b3 & 8, b3 & 4, b3 & 2, b3 & 1,
    b4 & 128, b4 & 64, b4 & 32, b4 & 16, b4 & 8, b4 & 4, b4 & 2, b4 & 1,
    b5 & 128, b5 & 64, b5 & 32, b5 & 16, b5 & 8, b5 & 4, b5 & 2, b5 & 1,
  ]
  for (let i = 0; i < bits.length; i++) {
    if (!bits[i]) mutedChords.push(YAM_CHORDS[i])
  }
  return { mutedChords, autoStart }
}

// ─── MIDI Track Parser ────────────────────────────────────────────────────────

/**
 * Parse the MIDI track.
 * Extracts: name, tempo, timeSignature, notes per StylePart channel.
 * Notes are assigned to parts based on MIDI markers.
 */
function parseMidiTrack(bytes, view, pos, end, ticksPerQuarter, style) {
  let absoluteTick = 0
  let runningStatus = 0
  let currentPartKey = null
  let partStartTick = 0
  // Map: `${channel}-${pitch}` → { tick, velocity }
  const openNotes = new Map()

  // For division inference (like MPL_MiscData)
  let countingNotes = false
  let sectionStartTick = 0
  let halfBeat = 0, offBeat = 0, triplet2 = 0, triplet3 = 0

  while (pos < end) {
    // Delta time
    const { value: delta, bytesRead: dLen } = readVarLen(bytes, pos, end)
    pos += dLen
    absoluteTick += delta

    if (pos >= end) break

    let statusByte = bytes[pos]

    // Running status: if high bit is not set, reuse last status
    if (statusByte < 0x80) {
      statusByte = runningStatus
      // do NOT advance pos
    } else {
      runningStatus = statusByte
      pos++
    }

    const eventType = statusByte & 0xF0
    const channel = statusByte & 0x0F

    if (statusByte === 0xFF) {
      // ── Meta event ──────────────────────────────────────────────────────────
      const metaType = bytes[pos++]
      const { value: metaLen, bytesRead: mLen } = readVarLen(bytes, pos, end)
      pos += mLen
      const metaEnd = pos + metaLen

      if (metaType === 0x03) {
        // Track name → style name
        style.name = readAscii(bytes, pos, metaLen).replace(/\0/g, '').trim()
      } else if (metaType === 0x06) {
        // Marker → StylePart boundary
        const marker = readAscii(bytes, pos, metaLen).replace(/\0/g, '').trim()

        // Close previous part: compute sizeInBeats
        if (currentPartKey !== null && style.parts[currentPartKey]) {
          const sizeTicks = absoluteTick - partStartTick
          style.parts[currentPartKey].sizeInBeats = Math.round(sizeTicks / ticksPerQuarter)
        }

        // Detect SFF type from marker
        if (marker === 'SFF1') { style.sffType = 'SFF1'; currentPartKey = null }
        else if (marker === 'SFF2') { style.sffType = 'SFF2'; currentPartKey = null }
        else {
          const key = marker.replace(/ /g, '_')
          currentPartKey = STYLE_PART_NAMES.includes(marker) ? key : null
          partStartTick = absoluteTick

          // Division inference: count notes only in Main A and Main B
          countingNotes = (marker === 'Main A' || marker === 'Main B')
          sectionStartTick = absoluteTick
        }
      } else if (metaType === 0x51 && metaLen === 3) {
        // Tempo: microseconds per beat → BPM
        const us = (bytes[pos] << 16) | (bytes[pos + 1] << 8) | bytes[pos + 2]
        style.tempo = Math.round(60_000_000 / us)
      } else if (metaType === 0x58 && metaLen === 4) {
        // Time signature
        const numerator = bytes[pos]
        const denominator = Math.pow(2, bytes[pos + 1])
        style.timeSignature = `${numerator}/${denominator}`
      } else if (metaType === 0x2F) {
        // End of track — close last part
        if (currentPartKey !== null && style.parts[currentPartKey]) {
          const sizeTicks = absoluteTick - partStartTick
          const size = Math.round(sizeTicks / ticksPerQuarter)
          if (size >= 1) style.parts[currentPartKey].sizeInBeats = size
        }
      }

      pos = metaEnd
      runningStatus = 0 // meta events reset running status

    } else if (statusByte === 0xF0 || statusByte === 0xF7) {
      // ── SysEx ───────────────────────────────────────────────────────────────
      const { value: sysLen, bytesRead: sLen } = readVarLen(bytes, pos, end)
      pos += sLen + sysLen
      runningStatus = 0

    } else if (eventType === 0x90 || eventType === 0x80) {
      // ── Note On / Note Off ──────────────────────────────────────────────────
      const pitch = bytes[pos++]
      const velocity = bytes[pos++]
      const isNoteOn = (eventType === 0x90) && (velocity > 0)
      const key = `${channel}-${pitch}`

      if (isNoteOn) {
        openNotes.set(key, { tick: absoluteTick, velocity })
      } else {
        // Note Off
        const on = openNotes.get(key)
        if (on && currentPartKey !== null && style.parts[currentPartKey]) {
          const relStart = (on.tick - partStartTick) / ticksPerQuarter
          const duration = (absoluteTick - on.tick) / ticksPerQuarter
          if (relStart >= 0 && duration > 0) {
            const ch = style.parts[currentPartKey].channels[channel]
            if (ch) {
              ch.notes.push({ pitch, velocity: on.velocity, position: relStart, duration })
            }
          }
          openNotes.delete(key)
        }
      }

      // Division inference
      if (countingNotes && channel >= 8) {
        const relTick = absoluteTick - sectionStartTick
        const inBeatFrac = (relTick / ticksPerQuarter) % 1
        const W = 0.0416
        if (inBeatFrac >= W && inBeatFrac < 1 - W) {
          offBeat++
          if (inBeatFrac >= 0.5 - W && inBeatFrac < 0.5 + W) halfBeat++
          else if (inBeatFrac >= 0.3333 - W && inBeatFrac < 0.3333 + W) triplet2++
          else if (inBeatFrac >= 0.6666 - W && inBeatFrac < 0.6666 + W) triplet3++
        }
      }

    } else if (eventType === 0xA0) {
      pos += 2 // Aftertouch: skip 2 bytes
    } else if (eventType === 0xB0) {
      pos += 2 // Control Change: skip 2 bytes
    } else if (eventType === 0xC0) {
      pos += 1 // Program Change: skip 1 byte
    } else if (eventType === 0xD0) {
      pos += 1 // Channel Pressure: skip 1 byte
    } else if (eventType === 0xE0) {
      pos += 2 // Pitch Bend: skip 2 bytes
    } else {
      // Unknown — skip 1 byte and hope for the best
      pos++
    }
  }

  // Infer division from note counts
  style.division = computeDivision(offBeat, halfBeat, triplet2, triplet3)
}

function computeDivision(offBeat, halfBeat, triplet2, triplet3) {
  if (offBeat === 0) return 'BINARY'
  const ratioHalfOff = halfBeat / offBeat
  const triplet2plus3 = triplet2 + triplet3
  const ratioTriplet3 = triplet2plus3 > 0 ? triplet3 / triplet2plus3 : 0
  if (ratioHalfOff < 0.22) {
    return ratioTriplet3 > 0.68 ? 'EIGHTH_SHUFFLE' : 'EIGHTH_TRIPLET'
  }
  return 'BINARY'
}

// ─── CASM Location ─────────────────────────────────────────────────────────────

/**
 * Find 'CASM' in bytes starting at pos.
 * JJazzLab allows ±1 byte tolerance (corrupted files).
 */
function findCasm(bytes, pos) {
  // Try exact position first
  if (pos + 4 <= bytes.length &&
      bytes[pos] === 0x43 && bytes[pos+1] === 0x41 &&
      bytes[pos+2] === 0x53 && bytes[pos+3] === 0x4D) {
    return pos
  }
  // Try -1 (1 byte early)
  if (pos > 0 && pos + 3 <= bytes.length &&
      bytes[pos-1] === 0x43 && bytes[pos] === 0x41 &&
      bytes[pos+1] === 0x53 && bytes[pos+2] === 0x4D) {
    return pos - 1
  }
  // Try +1 (1 byte late)
  if (pos + 5 <= bytes.length &&
      bytes[pos+1] === 0x43 && bytes[pos+2] === 0x41 &&
      bytes[pos+3] === 0x53 && bytes[pos+4] === 0x4D) {
    return pos + 1
  }
  // Scan forward up to 32 bytes
  for (let i = pos; i < Math.min(pos + 32, bytes.length - 4); i++) {
    if (bytes[i] === 0x43 && bytes[i+1] === 0x41 && bytes[i+2] === 0x53 && bytes[i+3] === 0x4D) {
      return i
    }
  }
  return -1
}

// ─── Low-level Helpers ─────────────────────────────────────────────────────────

function readUInt32(view, pos) {
  return view.getUint32(pos, false) // big-endian
}

function readUInt16(view, pos) {
  return view.getUint16(pos, false)
}

function readAscii(bytes, pos, length) {
  let str = ''
  for (let i = 0; i < length && pos + i < bytes.length; i++) {
    str += String.fromCharCode(bytes[pos + i])
  }
  return str
}

function readVarLen(bytes, pos, end) {
  let value = 0
  let bytesRead = 0
  let byte
  do {
    if (pos + bytesRead >= end) throw new Error('readVarLen: exceeded bounds')
    byte = bytes[pos + bytesRead]
    bytesRead++
    value = ((value << 7) | (byte & 0x7F)) >>> 0
  } while (byte & 0x80)
  return { value, bytesRead }
}
