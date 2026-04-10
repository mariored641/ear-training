/**
 * useBackingTrackEngine.js
 * Central state + audio hook for BackingPlayer — powered by BackingTrackEngine
 * (SoundFont + Yamaha .sty + ChordEngine + Humanizer)
 *
 * Drop-in replacement for the old useBackingTrack.js (Tone.js samplers).
 * Returns the same API, plus: currentChordSymbol, currentBeat, beatsPerBar, sfStatus, sfMsg
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { BackingTrackEngine }  from '../../lib/style-engine/BackingTrackEngine'
import { parseSty }            from '../../lib/style-engine/StyleParser'
import { PRESETS as HUMAN_PRESETS } from '../../lib/style-engine/Humanizer'
import { parseChordSymbol, PITCH_NAMES, NOTE_PITCHES } from '../../lib/style-engine/YamChordMap'
import { getChordData }        from '../../lib/style-engine/YamChordMap'
import * as SFP                from '../../lib/soundfont/SoundFontPlayer'

// ─── Genre Catalog ─────────────────────────────────────────────────────────────
// 4 categories × 3 sub-styles each

export const GENRE_CATALOG = [
  {
    category: 'jazz',
    label: 'Jazz',
    icon: '🎷',
    subtypes: [
      { id: 'jazz_swing',   label: 'Jazz Vocal',       bpm: 192, sty: '/styles-appdata/Yamaha/Jazzvocal.s264.sty',        human: 'jazz' },
      { id: 'jazz_cool',    label: 'LA Cool Swing',    bpm: 126, sty: '/styles/Swing&Jazz/LACoolSwing.STY',               human: 'jazz' },
      { id: 'jazz_waltz',   label: 'Jazz Waltz Fast',  bpm: 194, sty: '/styles-appdata/Yamaha/JazzWaltzFast.S499.sty',    human: 'jazz' },
      { id: 'jazz_bebop',   label: 'Bebop',            bpm: 240, sty: '/styles/Swing&Jazz/Bebop.S468.sst',                human: 'jazz' },
      { id: 'jazz_bigband', label: 'Big Band Fast',    bpm: 180, sty: '/styles/Swing&Jazz/BigBandFast1.S198.sst',         human: 'jazz' },
      { id: 'jazz_club',    label: 'Jazz Club',        bpm: 164, sty: '/styles/Swing&Jazz/JazzClub.S120.prs',             human: 'jazz' },
      { id: 'jazz_gypsy',   label: 'Gypsy Swing',      bpm: 232, sty: '/styles/Swing&Jazz/GypsySwing.S173.prs',           human: 'jazz' },
      { id: 'jazz_ballad',  label: 'Orch Jazz Ballad', bpm: 72,  sty: '/styles/Swing&Jazz/OrchJazzBallad.S158.prs',       human: 'jazz' },
      { id: 'jazz_gospel',  label: 'Gospel Swing',     bpm: 110, sty: '/styles/Swing&Jazz/GospelSwing.S046.sst',          human: 'jazz' },
    ],
  },
  {
    category: 'latin',
    label: 'Latin',
    icon: '🌴',
    subtypes: [
      { id: 'latin_bossa',     label: 'Cool Bossa',      bpm: 168, sty: '/styles/Latin/CoolBossa.S460.sty',        human: 'bossa' },
      { id: 'latin_samba',     label: 'Brazilian Samba', bpm: 96,  sty: '/styles/Latin/BrazilianSamba.sty',        human: 'latin' },
      { id: 'latin_54',        label: 'Five-Four',       bpm: 168, sty: '/styles/Swing&Jazz/Five-Four.S725.prs',   human: 'jazz'  },
      { id: 'latin_fastbossa', label: 'Fast Bossa',      bpm: 175, sty: '/styles/Latin/FastBossa.S629.prs',        human: 'bossa' },
      { id: 'latin_mambo',     label: 'Mambo',           bpm: 104, sty: '/styles/Latin/Mambo.S635.prs',            human: 'latin' },
      { id: 'latin_samba2',    label: 'Samba 3',         bpm: 110, sty: '/styles/Latin/Samba_3.S506.STY',          human: 'latin' },
      { id: 'latin_salsa',     label: 'Salsa 1',         bpm: 92,  sty: '/styles/Latin/Salsa 1.S651.STY',          human: 'latin' },
      { id: 'latin_chacha',    label: 'Organ Cha-Cha',   bpm: 132, sty: '/styles/Latin/OrganChaCha.sty',           human: 'latin' },
    ],
  },
  {
    category: 'blues',
    label: 'Blues',
    icon: '🎸',
    subtypes: [
      { id: 'blues_shuffle', label: "Mr Mac's Blues",  bpm: 63,  sty: "/styles-appdata/Yamaha/MrMac'sBlues.T148.STY", human: 'blues' },
      { id: 'blues_kool',    label: 'Kool Shuffle',   bpm: 90,  sty: '/styles/R&B/KoolShuffle.STY',                  human: 'blues' },
      { id: 'blues_soul',    label: 'Soul Shuffle',   bpm: 98,  sty: '/styles/R&B/SoulShuffle.STY',                  human: 'blues' },
      { id: 'blues_slow',    label: 'Slow Blues',     bpm: 49,  sty: '/styles/R&B/SlowBlues.S594.sst',               human: 'blues' },
      { id: 'blues_gospel',  label: 'Gospel Swing',   bpm: 110, sty: '/styles/Swing&Jazz/GospelSwing.S046.sst',      human: 'blues' },
      { id: 'blues_funk',    label: 'Jazz Funk',      bpm: 120, sty: '/styles/R&B/JazzFunk.STY',                     human: 'blues' },
      { id: 'blues_16beat',  label: '16 Beat Ferna',  bpm: 80,  sty: '/styles/R&B/16BeatFerna.sty',                  human: 'blues' },
      { id: 'blues_simple',  label: 'Simple Shuffle', bpm: 132, sty: '/styles/Swing&Jazz/SimpleShuffle.S643.bcs',    human: 'blues' },
    ],
  },
  {
    category: 'rock',
    label: 'Rock & Pop',
    icon: '🤘',
    subtypes: [
      { id: 'rock_standard', label: 'Standard Rock',  bpm: 110, sty: '/styles-appdata/Yamaha/StandardRock.STY',   human: 'rock' },
      { id: 'rock_pop',      label: 'Pop Rock',      bpm: 94,  sty: '/styles/Pop&Rock/PopRock.STY',              human: 'rock' },
      { id: 'rock_power',    label: 'Power Rock',    bpm: 112, sty: '/styles/Pop&Rock/PowerRock.STY',            human: 'rock' },
      { id: 'pop_chart',     label: 'Chart Pop',     bpm: 92,  sty: '/styles/Dance/ChartPop.S321.prs',           human: 'rock' },
      { id: 'pop_retro',     label: 'Retro Pop',     bpm: 128, sty: '/styles/Dance/RetroPop.S502.prs',           human: 'rock' },
      { id: 'pop_80s',       label: "80's Dance",    bpm: 120, sty: "/styles/Dance/80'sDance.S305.prs",          human: 'rock' },
      { id: 'pop_uk',        label: 'UK Pop',        bpm: 124, sty: '/styles/Dance/UKPop.S583.prs',              human: 'rock' },
      { id: 'pop_hiphop',    label: 'Hip Hop Pop',   bpm: 104, sty: '/styles/Dance/HipHopPop.S585.prs',          human: 'rock' },
    ],
  },
  {
    category: 'country',
    label: 'Country',
    icon: '🤠',
    subtypes: [
      { id: 'country_train',    label: 'Country Train Bt', bpm: 80,  sty: '/styles/Country/CountryTrain Bt.sty',        human: 'rock' },
      { id: 'country_finger',   label: 'Finger Pickin',   bpm: 68,  sty: '/styles/Country/FingerPickin.sty',            human: 'rock' },
      { id: 'country_modern',   label: 'Mod Pickin!',     bpm: 96,  sty: '/styles-appdata/Yamaha/ModPickin!.T151.STY',  human: 'rock' },
      { id: 'country_brothers', label: 'Cntry Brothers',  bpm: 92,  sty: '/styles/Country/CntryBrothers.S624.prs',      human: 'rock' },
      { id: 'country_shuffle',  label: 'Country Shuffle', bpm: 126, sty: '/styles/Country/CountryShuffle.S477.bcs',     human: 'rock' },
      { id: 'country_modpop',   label: 'Mod Cntry Pop',   bpm: 68,  sty: '/styles/Country/ModCntryPop.S096.prs',        human: 'rock' },
      { id: 'country_waltz',    label: 'Swing Waltz',     bpm: 74,  sty: '/styles/Country/SwingWaltz.S714.prs',         human: 'rock' },
      { id: 'country_ballad',   label: 'Pop Ballad',      bpm: 77,  sty: '/styles/Country/PopBallad.S540.prs',          human: 'rock' },
    ],
  },
]

// ─── Flat maps built from catalog ─────────────────────────────────────────────

const GENRE_STYLES = {}
const GENRE_HUMAN  = {}
export const GENRE_BPM = {}
for (const cat of GENRE_CATALOG) {
  for (const sub of cat.subtypes) {
    GENRE_STYLES[sub.id] = sub.sty
    GENRE_HUMAN[sub.id]  = sub.human
    GENRE_BPM[sub.id]    = sub.bpm
  }
}

// ─── 12-bar blues preset (shared across blues sub-styles) ─────────────────────

const BLUES_PRESET_12 = [
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'F', quality: 'major', extensions: ['7'] },
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'F', quality: 'major', extensions: ['7'] },
  { root: 'F', quality: 'major', extensions: ['7'] },
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'G', quality: 'major', extensions: ['7'] },
  { root: 'F', quality: 'major', extensions: ['7'] },
  { root: 'C', quality: 'major', extensions: ['7'] },
  { root: 'G', quality: 'major', extensions: ['7'] },
]

// ─── Genre defaults ────────────────────────────────────────────────────────────

export const GENRE_DEFAULTS = {
  // ── Jazz ──
  jazz_swing: {
    tempo: 120,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
    ],
  },
  jazz_cool: {
    tempo: 110,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
    ],
  },
  jazz_waltz: {
    tempo: 180,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 6,
    preset: [
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'E', quality: 'minor', extensions: ['7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
    ],
  },

  jazz_bebop: {
    tempo: 240,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor',  extensions: ['7'] },
      { root: 'G', quality: 'major',  extensions: ['7'] },
      { root: 'C', quality: 'major',  extensions: ['maj7'] },
      { root: 'A', quality: 'major',  extensions: ['7'] },
      { root: 'D', quality: 'minor',  extensions: ['7'] },
      { root: 'G', quality: 'major',  extensions: ['7'] },
      { root: 'C', quality: 'major',  extensions: ['maj7'] },
      { root: 'C', quality: 'major',  extensions: ['maj7'] },
    ],
  },
  jazz_bigband: {
    tempo: 180,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
    ],
  },
  jazz_club: {
    tempo: 164,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
    ],
  },
  jazz_gypsy: {
    tempo: 232,
    defaultChord: { root: 'D', quality: 'minor', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'D', quality: 'minor', extensions: [] },
      { root: 'D', quality: 'minor', extensions: [] },
      { root: 'A', quality: 'major', extensions: ['7'] },
      { root: 'A', quality: 'major', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: [] },
      { root: 'D', quality: 'minor', extensions: [] },
      { root: 'A', quality: 'major', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: [] },
    ],
  },
  jazz_ballad: {
    tempo: 72,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'E', quality: 'minor', extensions: ['7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
    ],
  },
  jazz_gospel: {
    tempo: 110,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: ['7'] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'F', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },

  // ── Latin ──
  latin_bossa: {
    tempo: 130,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },
  latin_samba: {
    tempo: 160,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  latin_54: {
    tempo: 168,
    defaultChord: { root: 'D', quality: 'minor', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'A', quality: 'major', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
    ],
  },
  latin_fastbossa: {
    tempo: 175,
    defaultChord: { root: 'C', quality: 'major', extensions: ['maj7'] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: ['maj7'] },
      { root: 'A', quality: 'minor', extensions: ['7'] },
      { root: 'D', quality: 'minor', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },
  latin_mambo: {
    tempo: 104,
    defaultChord: { root: 'C', quality: 'minor', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },
  latin_samba2: {
    tempo: 110,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  latin_salsa: {
    tempo: 92,
    defaultChord: { root: 'C', quality: 'minor', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'minor', extensions: [] },
    ],
  },
  latin_chacha: {
    tempo: 132,
    defaultChord: { root: 'C', quality: 'minor', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },

  // ── Blues ──
  blues_shuffle: {
    tempo: 100,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_kool: {
    tempo: 110,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_soul: {
    tempo: 98,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_slow: {
    tempo: 49,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_gospel: {
    tempo: 110,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: ['7'] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'F', quality: 'minor', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
    ],
  },
  blues_funk: {
    tempo: 120,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_16beat: {
    tempo: 80,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },
  blues_simple: {
    tempo: 132,
    defaultChord: { root: 'C', quality: 'major', extensions: ['7'] },
    presetBarCount: 12,
    preset: BLUES_PRESET_12,
  },

  // ── Rock ──
  rock_standard: {
    tempo: 130,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'F',  quality: 'major', extensions: [] },
      { root: 'F',  quality: 'major', extensions: [] },
      { root: 'G',  quality: 'major', extensions: [] },
      { root: 'F',  quality: 'major', extensions: [] },
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'G',  quality: 'major', extensions: [] },
    ],
  },
  rock_pop: {
    tempo: 125,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  rock_power: {
    tempo: 112,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'Bb', quality: 'major', extensions: [] },
      { root: 'F',  quality: 'major', extensions: [] },
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'C',  quality: 'major', extensions: [] },
      { root: 'Bb', quality: 'major', extensions: [] },
      { root: 'F',  quality: 'major', extensions: [] },
      { root: 'G',  quality: 'major', extensions: [] },
    ],
  },
  pop_chart: {
    tempo: 92,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  pop_retro: {
    tempo: 128,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  pop_80s: {
    tempo: 120,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  pop_uk: {
    tempo: 124,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  pop_hiphop: {
    tempo: 104,
    defaultChord: { root: 'C', quality: 'minor', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'minor', extensions: [] },
      { root: 'Ab', quality: 'major', extensions: [] },
      { root: 'Eb', quality: 'major', extensions: [] },
      { root: 'Bb', quality: 'major', extensions: [] },
    ],
  },

  // ── Country ── (presets in C Major)
  country_train: {
    tempo: 120,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  country_finger: {
    tempo: 100,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  country_modern: {
    tempo: 96,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  country_brothers: {
    tempo: 92,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  country_shuffle: {
    tempo: 126,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 8,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  country_modpop: {
    tempo: 68,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
  country_waltz: {
    tempo: 74,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 6,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'E', quality: 'minor', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'D', quality: 'minor', extensions: [] },
      { root: 'G', quality: 'major', extensions: ['7'] },
      { root: 'C', quality: 'major', extensions: [] },
    ],
  },
  country_ballad: {
    tempo: 77,
    defaultChord: { root: 'C', quality: 'major', extensions: [] },
    presetBarCount: 4,
    preset: [
      { root: 'C', quality: 'major', extensions: [] },
      { root: 'A', quality: 'minor', extensions: [] },
      { root: 'F', quality: 'major', extensions: [] },
      { root: 'G', quality: 'major', extensions: [] },
    ],
  },
}

// ─── chordDisplayName (replaces lib/backing-tracks/chords.js dependency) ─────

const QUALITY_SYMBOL = { major: '', minor: 'm', diminished: 'dim', augmented: 'aug', halfDim: 'ø', sus2: 'sus2', sus4: 'sus4' }

export function chordDisplayName(chord) {
  const exts = (chord.extensions || []).join('')
  const name = `${chord.root}${QUALITY_SYMBOL[chord.quality] || ''}${exts}`
  return chord.bassNote ? `${name}/${chord.bassNote}` : name
}

// ─── Key Transpose Utilities ──────────────────────────────────────────────────

const SHARP_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const FLAT_NOTE_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

const FLAT_MAJOR_KEYS  = new Set(['F','Bb','Eb','Ab','Db','Gb'])
const SHARP_MAJOR_KEYS = new Set(['G','D','A','E','B','F#'])
const FLAT_MINOR_KEYS  = new Set(['D','G','C','F','Bb','Eb'])
const SHARP_MINOR_KEYS = new Set(['E','B','F#','C#','G#','D#'])

function noteNamesForKey(root, type) {
  if (type === 'major') {
    if (FLAT_MAJOR_KEYS.has(root))  return FLAT_NOTE_NAMES
    if (SHARP_MAJOR_KEYS.has(root)) return SHARP_NOTE_NAMES
  } else {
    if (FLAT_MINOR_KEYS.has(root))  return FLAT_NOTE_NAMES
    if (SHARP_MINOR_KEYS.has(root)) return SHARP_NOTE_NAMES
  }
  return FLAT_NOTE_NAMES // C major / A minor — neutral, use flats for accidentals
}

function transposeNoteName(noteName, semitones, names) {
  const pitch = NOTE_PITCHES[noteName]
  if (pitch === undefined) return noteName
  return names[((pitch + semitones) % 12 + 12) % 12]
}

export function transposeChordProgression(chords, semitones, targetRoot, targetType) {
  if (semitones === 0) return chords.map(c => ({ ...c, extensions: [...(c.extensions || [])] }))
  const names = noteNamesForKey(targetRoot, targetType)
  return chords.map(chord => {
    const newRoot = transposeNoteName(chord.root, semitones, names)
    const result  = { ...chord, root: newRoot, extensions: [...(chord.extensions || [])] }
    if (chord.bassNote) result.bassNote = transposeNoteName(chord.bassNote, semitones, names)
    return result
  })
}


// ─── Chord format conversion ──────────────────────────────────────────────────
// Old format: { root: 'D', quality: 'minor', extensions: ['7'] }  → symbol string 'Dm7'
// Used when sending chords to BackingTrackEngine

export function oldChordToSymbol(chord) {
  const root    = chord.root    || 'C'
  const quality = chord.quality || 'major'
  const exts    = chord.extensions || []

  const has7       = exts.includes('7')
  const hasMaj7    = exts.includes('maj7')
  const has9       = exts.includes('9')
  const has11      = exts.includes('11')
  const has13      = exts.includes('13')
  const hasSharp11 = exts.includes('#11')
  const hasSharp9  = exts.includes('#9')
  const hasFlat9   = exts.includes('b9')
  const hasAdd9    = exts.includes('add9')

  let suffix
  switch (quality) {
    case 'major':
      if      (hasMaj7 && hasSharp11) suffix = 'maj7#11'
      else if (hasMaj7 && has9)       suffix = 'maj9'
      else if (hasMaj7)               suffix = 'maj7'
      else if (has7 && hasSharp9)     suffix = '7#9'
      else if (has7 && hasFlat9)      suffix = '7b9'
      else if (has7 && has13)         suffix = '13'
      else if (has7 && hasSharp11)    suffix = '7#11'
      else if (has7 && has9)          suffix = '9'
      else if (has7)                  suffix = '7'
      else if (has9 || hasAdd9)       suffix = 'add9'
      else                            suffix = ''
      break
    case 'minor':
      if      (hasMaj7 && has9)  suffix = 'mmaj9'
      else if (hasMaj7)          suffix = 'mmaj7'
      else if (has7 && has11)    suffix = 'min11'
      else if (has7 && has9)     suffix = 'm9'
      else if (has7)             suffix = 'm7'
      else if (has9 || hasAdd9)  suffix = 'madd9'
      else                       suffix = 'm'
      break
    case 'augmented':
      if      (hasMaj7) suffix = 'maj7aug'
      else if (has7)    suffix = '7#5'
      else              suffix = 'aug'
      break
    case 'diminished':
      suffix = has7 ? 'dim7' : 'dim'
      break
    case 'halfDim':
      suffix = 'm7b5'
      break
    case 'minMaj7':
      suffix = has9 ? 'mmaj9' : 'mmaj7'
      break
    case 'sus2':
      suffix = 'sus2'
      break
    case 'sus4':
      suffix = has7 ? '7sus4' : 'sus4'
      break
    default:
      suffix = ''
  }
  return `${root}${suffix}`
}

// ─── Chord display helper ──────────────────────────────────────────────────────
// Converts a { rootPitch, typeName } (from engine callback) to a readable symbol

const YTYPE_DISPLAY = {
  'Maj':       '',      'Maj7':      'maj7',  'Maj6':      '6',
  'Maj(9)':    'add9',  'Maj7(9)':   'maj9',  'Maj6(9)':   '6/9',
  'Maj7#11':   'maj7#11', 'Maj7aug': 'maj7+',
  'min':       'm',     'min7':      'm7',    'min6':      'm6',
  'min(9)':    'madd9', 'min7(9)':   'm9',   'min7(11)':  'm11',
  'minMaj7':   'mM7',   'minMaj7(9)':'mM9',
  '7th':       '7',     '7(9)':      '9',     '7(b9)':     '7b9',
  '7(#9)':     '7#9',   '7(13)':     '13',    '7(b13)':    '7b13',
  '7#11':      '7#11',  '7b5':       '7b5',   '7sus4':     '7sus',
  '7aug':      '7+',    'dim':       'dim',   'dim7':      'dim7',
  'm7b5':      'ø',     'aug':       '+',     'sus4':      'sus4',
  '1+2+5':     'sus2',  '1+5':       '5',     '1+8':       'oct',
}

function chordObjToLabel(chord) {
  if (!chord) return '–'
  const root    = PITCH_NAMES[chord.rootPitch] ?? '?'
  const display = YTYPE_DISPLAY[chord.typeName] ?? chord.typeName ?? ''
  return `${root}${display}`
}

// ─── Volume → gain mapping ─────────────────────────────────────────────────────

function volumesToGain(volumes) {
  // Average of all 4 sliders, mapped to 0–2.5 gain range
  const avg = (volumes.piano + volumes.guitar + volumes.bass + volumes.drums) / 4
  return avg * 2.5
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_VOLUMES   = { piano: 0.85, guitar: 0.85, bass: 0.85, drums: 0.85 }
const DEFAULT_GENRE     = 'jazz_swing'
const DEFAULT_BAR_COUNT = 4

function makeEmptyBars(genre, count) {
  const d = (GENRE_DEFAULTS[genre] ?? GENRE_DEFAULTS.jazz_swing).defaultChord
  return Array.from({ length: count }, () => ({ ...d, extensions: [...(d.extensions || [])] }))
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useBackingTrackEngine() {
  const [genre,       setGenreState]    = useState(DEFAULT_GENRE)
  const [barCount,    setBarCountState] = useState(DEFAULT_BAR_COUNT)
  const [chords,      setChordsState]   = useState(() => makeEmptyBars(DEFAULT_GENRE, DEFAULT_BAR_COUNT))
  const [tempo,       setTempoState]    = useState(GENRE_DEFAULTS[DEFAULT_GENRE].tempo)
  const [isPlaying,   setIsPlaying]     = useState(false)
  const [currentBar,  setCurrentBar]    = useState(0)
  const [maxLoops,    setMaxLoopsState] = useState(0)
  const [volumes,     setVolumesState]  = useState(DEFAULT_VOLUMES)
  const [isLoading,   setIsLoading]     = useState(false)
  const [loopCount,   setLoopCountState] = useState(0)

  // New state
  const [currentChordSymbol, setCurrentChordSymbol] = useState(null)
  const [currentBeat,        setCurrentBeat]         = useState(null)
  const [beatsPerBar,        setBeatsPerBar]          = useState(4)
  const [sfStatus,           setSfStatus]             = useState('idle')
  const [sfMsg,              setSfMsg]                = useState('')
  const [selectedKey,        setSelectedKeyState]     = useState({ root: 'C', type: 'major' })

  // Practice mode config (stored in ref for sync access in audio callback)
  const practiceRef = useRef({
    tempoEnabled: false, tempoAmount: 5, tempoEvery: 1,
    transposeEnabled: false, transposeSemitones: 1, transposeEvery: 1,
  })

  // Refs — writable without re-renders
  const chordsRef       = useRef(chords)
  const volumesRef      = useRef(volumes)
  const maxLoopsRef     = useRef(maxLoops)
  const genreRef        = useRef(genre)
  const barCountRef     = useRef(barCount)
  const tempoRef        = useRef(tempo)
  const isPlayingRef    = useRef(false)
  const beatsPerBarRef  = useRef(4)

  const selectedKeyRef  = useRef({ root: 'C', type: 'major' })
  const engineRef       = useRef(null)
  const styleCache      = useRef({})   // genre → parsed style object
  const loopCountRef    = useRef(0)
  const lastLoopBeatRef = useRef(-1)

  useEffect(() => { chordsRef.current    = chords    }, [chords])
  useEffect(() => { volumesRef.current   = volumes   }, [volumes])
  useEffect(() => { maxLoopsRef.current  = maxLoops  }, [maxLoops])
  useEffect(() => { genreRef.current     = genre     }, [genre])
  useEffect(() => { barCountRef.current  = barCount  }, [barCount])
  useEffect(() => { tempoRef.current     = tempo     }, [tempo])

  // ── Engine singleton per mount ──────────────────────────────────────────────
  useEffect(() => {
    engineRef.current = new BackingTrackEngine()
    return () => { engineRef.current?.stop() }
  }, [])

  // ── SF2 loading ─────────────────────────────────────────────────────────────
  const ensureSF2 = useCallback(async () => {
    if (SFP.isReady()) return
    setSfStatus('loading')
    await engineRef.current.init((msg) => {
      setSfMsg(msg)
    })
    setSfStatus('ready')
    setSfMsg('')
  }, [])

  // ── Style loading ────────────────────────────────────────────────────────────
  const ensureStyle = useCallback(async (genreName) => {
    const engine = engineRef.current
    if (styleCache.current[genreName]) {
      engine.setStyle(styleCache.current[genreName])
      engine.setHumanizerConfig(HUMAN_PRESETS[GENRE_HUMAN[genreName]] ?? HUMAN_PRESETS.jazz)
      const bpb = parseInt(styleCache.current[genreName].timeSignature) || 4
      beatsPerBarRef.current = bpb
      setBeatsPerBar(bpb)
      return
    }
    const url = GENRE_STYLES[genreName]
    if (!url) throw new Error(`Unknown genre: ${genreName}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    const buf   = await res.arrayBuffer()
    const style = parseSty(buf)
    styleCache.current[genreName] = style
    engine.setStyle(style)
    engine.setHumanizerConfig(HUMAN_PRESETS[GENRE_HUMAN[genreName]] ?? HUMAN_PRESETS.jazz)
    const bpb = parseInt(style.timeSignature) || 4
    beatsPerBarRef.current = bpb
    setBeatsPerBar(bpb)
    // Auto-set tempo from the parsed style file
    if (style.tempo > 0) {
      setTempoState(style.tempo)
      tempoRef.current = style.tempo
      engine.setTempo(style.tempo)
    }
  }, [])

  // ── Key selector ─────────────────────────────────────────────────────────────
  const setKey = useCallback((root, type) => {
    const oldKey   = selectedKeyRef.current
    const oldPitch = NOTE_PITCHES[oldKey.root] ?? 0
    const newPitch = NOTE_PITCHES[root] ?? 0
    // Pitch-only shift
    let semitones = ((newPitch - oldPitch) % 12 + 12) % 12
    // Mode shift: Major→Minor = +3 semitones (Dm-G-C → Fm-Bb-Eb)
    //             Minor→Major = −3 semitones
    if (oldKey.type === 'major' && type === 'minor') semitones = (semitones + 3) % 12
    if (oldKey.type === 'minor' && type === 'major') semitones = ((semitones - 3) % 12 + 12) % 12

    if (semitones !== 0) {
      const transposed = transposeChordProgression(chordsRef.current, semitones, root, type)
      setChordsState(transposed)
      chordsRef.current = transposed
    }
    const newKey = { root, type }
    setSelectedKeyState(newKey)
    selectedKeyRef.current = newKey
  }, [])

  // ── Stop ────────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    engineRef.current?.stop()
    setIsPlaying(false)
    isPlayingRef.current = false
    setCurrentBar(0)
    setCurrentChordSymbol(null)
    setCurrentBeat(null)
    loopCountRef.current    = 0
    setLoopCountState(0)
    lastLoopBeatRef.current = -1
  }, [])

  // ── Play ─────────────────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    stop()
    setIsLoading(true)
    try {
      await ensureSF2()
      await ensureStyle(genreRef.current)

      const engine = engineRef.current
      const bpm    = tempoRef.current
      const bpb    = beatsPerBarRef.current

      engine.setTempo(bpm)
      engine.setGain(volumesToGain(volumesRef.current))

      // One chord per bar (or half-bar if beats:2), variable beat duration
      engine.setChordProgression(
        chordsRef.current.map(chord => ({
          symbol: oldChordToSymbol(chord),
          beats:  chord.beats ?? bpb,
        }))
      )

      // Reset loop tracking
      loopCountRef.current    = 0
      setLoopCountState(0)
      lastLoopBeatRef.current = -1

      engine.onBeat = ({ beat, chord, loopBeat }) => {
        const barInProg = Math.floor(loopBeat / bpb)
        setCurrentBar(barInProg)
        setCurrentBeat(beat)
        if (chord) setCurrentChordSymbol(chordObjToLabel(chord))

        // Loop counting, practice mode & max loops
        if (lastLoopBeatRef.current >= 0 && loopBeat < lastLoopBeatRef.current) {
          loopCountRef.current += 1
          setLoopCountState(loopCountRef.current)
          const lc = loopCountRef.current

          // ── Practice mode: tempo increase ──
          const pc = practiceRef.current
          if (pc.tempoEnabled && lc % pc.tempoEvery === 0) {
            const newTempo = Math.min(300, tempoRef.current + pc.tempoAmount)
            tempoRef.current = newTempo
            setTempoState(newTempo)
            engine.setTempo(newTempo)
          }

          // ── Practice mode: transposition ──
          if (pc.transposeEnabled && lc % pc.transposeEvery === 0) {
            const ROOT_NOTES_INT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
            const key = selectedKeyRef.current
            const curIdx = ROOT_NOTES_INT.indexOf(key.root)
            if (curIdx >= 0) {
              const newIdx = (curIdx + pc.transposeSemitones) % 12
              const newRoot = ROOT_NOTES_INT[newIdx]
              const transposed = transposeChordProgression(chordsRef.current, pc.transposeSemitones, newRoot, key.type)
              chordsRef.current = transposed
              setChordsState(transposed)
              const newKey = { root: newRoot, type: key.type }
              selectedKeyRef.current = newKey
              setSelectedKeyState(newKey)
              // Update engine's chord progression so audio follows
              engine.setChordProgression(
                transposed.map(c => ({
                  symbol: oldChordToSymbol(c),
                  beats: c.beats ?? beatsPerBarRef.current,
                }))
              )
            }
          }

          // ── Max loops ──
          const ml = maxLoopsRef.current
          if (ml > 0 && loopCountRef.current >= ml) {
            setTimeout(stop, 0)
          }
        }
        lastLoopBeatRef.current = loopBeat
      }

      engine.onChordChange = ({ to }) => {
        if (to) setCurrentChordSymbol(chordObjToLabel(to))
      }

      await engine.play()
      setIsPlaying(true)
      isPlayingRef.current = true
    } catch (err) {
      console.error('[BackingTrackEngine] play error:', err)
      setSfStatus('error')
      setSfMsg(`שגיאה: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [stop, ensureSF2, ensureStyle])

  // ── Tempo ────────────────────────────────────────────────────────────────────
  const setTempo = useCallback((bpm) => {
    setTempoState(bpm)
    tempoRef.current = bpm
    engineRef.current?.setTempo(bpm)
  }, [])

  // ── Max loops ────────────────────────────────────────────────────────────────
  const setMaxLoops = useCallback((n) => {
    setMaxLoopsState(n)
    maxLoopsRef.current = n
  }, [])

  // ── Genre change ─────────────────────────────────────────────────────────────
  const setGenre = useCallback((newGenre) => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    setGenreState(newGenre)
    genreRef.current = newGenre

    const bpm = GENRE_BPM[newGenre] ?? GENRE_DEFAULTS[newGenre]?.tempo ?? 120
    setTempoState(bpm)
    tempoRef.current = bpm

    if (wasPlaying) setTimeout(() => play(), 100)
  }, [stop, play])

  // ── Load preset ──────────────────────────────────────────────────────────────
  const loadPreset = useCallback(() => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    const defaults   = GENRE_DEFAULTS[genreRef.current] ?? GENRE_DEFAULTS.jazz_swing
    let presetChords = defaults.preset.map(c => ({ ...c, extensions: [...(c.extensions || [])] }))
    const newCount   = defaults.presetBarCount

    // All presets are in C Major. Transpose to selected key.
    // Minor adds 3 semitones on top of the root shift (Major→Minor = +3).
    const { root, type } = selectedKeyRef.current
    let toPitch = NOTE_PITCHES[root] ?? 0
    if (type === 'minor') toPitch = (toPitch + 3) % 12
    if (toPitch !== 0) {
      presetChords = transposeChordProgression(presetChords, toPitch, root, type)
    }

    setChordsState(presetChords)
    chordsRef.current  = presetChords
    setBarCountState(newCount)
    barCountRef.current = newCount

    if (wasPlaying) setTimeout(() => play(), 100)
  }, [stop, play])

  // ── Bar count change ─────────────────────────────────────────────────────────
  const setBarCount = useCallback((newCount) => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    const defaults = GENRE_DEFAULTS[genreRef.current] ?? GENRE_DEFAULTS.jazz_swing
    const current  = chordsRef.current.slice(0, newCount)
    const filled   = [
      ...current,
      ...Array.from({ length: Math.max(0, newCount - current.length) }, () => ({
        ...defaults.defaultChord,
        extensions: [...(defaults.defaultChord.extensions || [])],
      })),
    ]

    setChordsState(filled)
    chordsRef.current   = filled
    setBarCountState(newCount)
    barCountRef.current = newCount

    if (wasPlaying) setTimeout(() => play(), 100)
  }, [stop, play])

  // ── Load jazz standard preset (from iReal data) ──────────────────────────────
  const loadJazzPreset = useCallback((song) => {
    const wasPlaying = isPlayingRef.current
    if (wasPlaying) stop()

    // ── Auto-switch genre based on time signature ──────────────────────────────
    const ts = song.timeSignature || '4/4'
    let targetGenre = genreRef.current

    if (ts === '3/4' || ts === '6/4') {
      // Waltz feel — use jazz_waltz regardless of current genre
      targetGenre = 'jazz_waltz'
    } else if (ts === '4/4' || ts === '2/4') {
      // If we were on jazz_waltz, switch back to swing
      if (targetGenre === 'jazz_waltz') targetGenre = 'jazz_swing'
    }
    // 5/4 and other odd meters: keep current genre (engine plays in 4/4)

    if (targetGenre !== genreRef.current) {
      setGenreState(targetGenre)
      genreRef.current = targetGenre
      // Note: ensureStyle() in play() will load the correct .sty automatically
    }

    // ── Load chords ────────────────────────────────────────────────────────────
    const chords = song.chords.map(c => ({ ...c, extensions: [...(c.extensions || [])] }))
    setChordsState(chords)
    chordsRef.current   = chords
    setBarCountState(chords.length)
    barCountRef.current = chords.length

    // ── Tempo from song (already resolved in JSON, never 0) ───────────────────
    if (song.tempo) {
      setTempoState(song.tempo)
      tempoRef.current = song.tempo
      engineRef.current?.setTempo(song.tempo)
    }

    // ── Update selectedKey to match song key ───────────────────────────────────
    if (song.key) {
      const { root, type } = song.key
      setSelectedKeyState({ root, type })
      selectedKeyRef.current = { root, type }
    }

    if (wasPlaying) setTimeout(() => play(), 100)
  }, [stop, play])

  // ── Set individual chord ─────────────────────────────────────────────────────
  const setChord = useCallback((barIndex, chord) => {
    setChordsState(prev => {
      const next = [...prev]
      next[barIndex] = chord
      chordsRef.current = next
      return next
    })
  }, [])

  // ── Preview chord (plays on SoundFont piano channel) ─────────────────────────
  const previewChord = useCallback(async (chord) => {
    try {
      if (!SFP.isReady()) await ensureSF2()
      const symbol           = oldChordToSymbol(chord)
      const { rootPitch, typeName } = parseChordSymbol(symbol)
      const { intervals }    = getChordData(typeName)
      const baseNote         = 48 + rootPitch  // C3 = MIDI 48
      const ch               = 0               // piano channel
      intervals.forEach(semi => {
        const pitch = baseNote + semi
        SFP.noteOn(ch, pitch, 80)
        setTimeout(() => SFP.noteOff(ch, pitch), 1600)
      })
    } catch (err) {
      console.warn('[BackingTrackEngine] previewChord error:', err)
    }
  }, [ensureSF2])

  // ── Volume ───────────────────────────────────────────────────────────────────
  const setVolume = useCallback((channel, val) => {
    setVolumesState(prev => {
      const next = { ...prev, [channel]: val }
      volumesRef.current = next
      engineRef.current?.setGain(volumesToGain(next))
      return next
    })
  }, [])

  // ── Practice config ──────────────────────────────────────────────────────────
  const setPracticeConfig = useCallback((config) => {
    practiceRef.current = { ...practiceRef.current, ...config }
  }, [])

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(() => () => stop(), [stop])

  return {
    // Original API (same as useBackingTrack)
    genre, barCount, chords, tempo, isPlaying, currentBar,
    maxLoops, volumes, isLoading,
    play, stop, setTempo, setMaxLoops,
    setGenre, setBarCount, loadPreset, loadJazzPreset,
    setChord, previewChord,
    setVolume,
    initPlayer: () => {},  // backward-compat no-op

    // New
    currentChordSymbol,
    currentBeat,
    beatsPerBar,
    sfStatus,
    sfMsg,
    selectedKey,
    setKey,
    loopCount,
    setPracticeConfig,
  }
}
