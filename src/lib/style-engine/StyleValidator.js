/**
 * StyleValidator.js — validates a parsed .sty style object.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */

export function validateStyle(style) {
  const errors = []
  const warnings = []

  if (!style) { errors.push('Style is null'); return { valid: false, errors, warnings } }

  if (!style.name) warnings.push('Style has no name')
  if (!style.ticksPerQuarter) errors.push('Missing ticksPerQuarter')
  if (style.tempo < 20 || style.tempo > 400) warnings.push(`Unusual tempo: ${style.tempo}`)
  if (!style.timeSignature) errors.push('Missing timeSignature')
  if (!['SFF1', 'SFF2'].includes(style.sffType)) errors.push(`Unknown sffType: ${style.sffType}`)

  const partKeys = Object.keys(style.parts || {})
  if (partKeys.length === 0) {
    errors.push('No StyleParts found')
  }

  if (!style.parts['Main_A']) {
    errors.push('Main_A is required but missing')
  }

  for (const [partKey, part] of Object.entries(style.parts || {})) {
    if (!part.sizeInBeats || part.sizeInBeats < 1) {
      errors.push(`${partKey}: sizeInBeats=${part.sizeInBeats} is invalid`)
    }

    const channelNums = Object.keys(part.channels || {})
    if (channelNums.length === 0) {
      warnings.push(`${partKey}: no channels found`)
    }

    for (const [ch, chData] of Object.entries(part.channels || {})) {
      const ctab = chData.ctab
      if (!ctab) { errors.push(`${partKey} ch${ch}: missing ctab`); continue }
      if (!ctab.accType) errors.push(`${partKey} ch${ch}: missing accType`)
      if (!ctab.ctb2Main) errors.push(`${partKey} ch${ch}: missing ctb2Main`)
      if (ctab.ctb2Main) {
        if (!ctab.ctb2Main.ntr) errors.push(`${partKey} ch${ch}: missing ctb2Main.ntr`)
        if (!ctab.ctb2Main.ntt) errors.push(`${partKey} ch${ch}: missing ctb2Main.ntt`)
      }
      if (!chData.notes || chData.notes.length === 0) {
        warnings.push(`${partKey} ch${ch} (${ctab.accType}): no notes`)
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** Print a style summary to console. */
export function logStyleSummary(style) {
  console.group(`[StyleParser] "${style.name}" — ${style.sffType}`)
  console.log(`Tempo: ${style.tempo} BPM | Time: ${style.timeSignature} | TPQ: ${style.ticksPerQuarter} | Division: ${style.division}`)

  const parts = Object.entries(style.parts)
  console.log(`Parts (${parts.length}):`)
  for (const [key, part] of parts) {
    const channels = Object.entries(part.channels)
    const noteTotal = channels.reduce((sum, [, ch]) => sum + ch.notes.length, 0)
    console.group(`  ${key} — ${part.sizeInBeats} beats — ${noteTotal} notes`)
    for (const [ch, chData] of channels) {
      const ctab = chData.ctab
      const main = ctab.ctb2Main
      console.log(
        `    ch${ch} ${ctab.accType.padEnd(10)} src:${ctab.sourceChordType.padEnd(8)} ` +
        `ntr:${main?.ntr?.padEnd(20) ?? '?'} ntt:${main?.ntt?.padEnd(16) ?? '?'} ` +
        `notes:${chData.notes.length}`
      )
    }
    console.groupEnd()
  }
  console.groupEnd()
}
