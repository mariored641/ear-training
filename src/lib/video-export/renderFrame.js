/**
 * Canvas renderer for one video frame. Pure drawing: everything it shows comes
 * from the `scene` object (see VideoExporter.buildScene), so it can be tested
 * with any 2D context. Layout is fixed left-to-right regardless of UI language.
 */
import { drawRosewoodBackground, drawWoodGrain } from '../../utils/woodGrain.js'

export const DESIGN_W = 1280
export const DESIGN_H = 720

const FONT = '"Segoe UI", "DejaVu Sans", Arial, sans-serif'
const C = {
  bg0: '#150d08', bg1: '#2a1a10',
  paper: '#f3ead3', paperInk: '#2b1d12',
  brass: '#d4a94f', brassDark: '#7d5f22',
  text: '#f6ecd6', dim: '#a8977b',
  chord: '#4fc3f7', root: '#ff5a4d', scale: 'rgba(235,225,205,0.55)',
}

function setFont(ctx, px, weight = 'bold') { ctx.font = `${weight} ${px}px ${FONT}` }

/** Draws `text` shrinking the font until it fits maxW. Returns the used font size. */
function fitText(ctx, text, x, y, px, maxW, { weight = 'bold', align = 'center', min = 12 } = {}) {
  let size = px
  setFont(ctx, size, weight)
  while (size > min && ctx.measureText(text).width > maxW) { size -= 2; setFont(ctx, size, weight) }
  ctx.textAlign = align
  ctx.fillText(text, x, y)
  return size
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Builds reusable (expensive) assets once per export. */
export function createAssets({ logo = null, makeCanvas }) {
  const wood = makeCanvas(940, 210)
  const wctx = wood.getContext('2d')
  drawRosewoodBackground(wctx, 0, 0, 940, 210)
  drawWoodGrain(wctx, 0, 0, 940, 210, 1337, 220)
  return { logo, wood }
}

function drawSidePanel(ctx, scene, assets) {
  const { labels, info } = scene
  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, 280, DESIGN_H)
  ctx.fillStyle = C.brass
  ctx.fillRect(280, 0, 6, DESIGN_H)

  if (assets.logo) ctx.drawImage(assets.logo, 10, 20, 260, 260)

  ctx.fillStyle = C.paperInk
  ctx.textBaseline = 'alphabetic'
  fitText(ctx, labels.style, 140, 330, 30, 250)
  setFont(ctx, 20, 'normal'); ctx.fillStyle = C.brassDark
  ctx.textAlign = 'center'
  ctx.fillText(`${info.key}  ·  ${info.bpm} BPM`, 140, 364)

  // Repetition box
  ctx.fillStyle = C.paperInk
  roundRect(ctx, 24, 410, 232, 150, 14); ctx.fill()
  ctx.fillStyle = C.brass
  fitText(ctx, labels.repetition, 140, 450, 26, 210, { weight: 'normal' })
  ctx.fillStyle = C.paper
  fitText(ctx, scene.phase === 'intro' ? labels.countIn : `${scene.repIndex + 1} / ${scene.repetitions}`, 140, 520, 62, 210)

  // Legend
  const rows = [[C.root, labels.legendRoot], [C.chord, labels.legendChordTone], ['#cfc6b3', labels.legendScale]]
  rows.forEach(([color, text], i) => {
    const y = 602 + i * 36
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(46, y - 7, 11, 0, Math.PI * 2); ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke()
    ctx.fillStyle = C.paperInk
    setFont(ctx, 20, 'normal'); ctx.textAlign = 'left'
    ctx.fillText(text, 68, y)
  })
}

function drawChordHeader(ctx, scene) {
  const cx = 783
  ctx.textBaseline = 'alphabetic'
  // Current chord — as large as the width allows
  ctx.fillStyle = scene.phase === 'intro' ? C.dim : C.text
  fitText(ctx, scene.chordLabel || '', cx, 208, 190, 930)

  // Next chord
  ctx.fillStyle = C.dim
  fitText(ctx, `${scene.labels.next}  ${scene.nextLabel || ''}`, cx, 284, 38, 700, { weight: 'normal' })

  // Beat dots
  const n = scene.beatsPerBar
  const gap = 64
  const startX = cx - ((n - 1) * gap) / 2
  for (let i = 0; i < n; i++) {
    const active = scene.beat === i
    ctx.beginPath()
    ctx.arc(startX + i * gap, 326, active ? 20 : 15, 0, Math.PI * 2)
    ctx.fillStyle = active ? (i === 0 ? C.root : C.brass) : 'rgba(255,255,255,0.14)'
    ctx.fill()
    if (active) { ctx.lineWidth = 3; ctx.strokeStyle = C.text; ctx.stroke() }
  }
}

function drawBarStrip(ctx, scene) {
  const chips = scene.chips
  if (!chips.length) return
  const left = 310, width = 940, top = 362
  const perRow = Math.min(chips.length, 16)
  const rows = Math.ceil(chips.length / perRow)
  const rowH = rows <= 2 ? 36 : 26
  const gap = 6
  const cw = (width - gap * (perRow - 1)) / perRow
  chips.forEach((chip, i) => {
    const col = i % perRow, row = Math.floor(i / perRow)
    const x = left + col * (cw + gap), y = top + row * (rowH + gap)
    roundRect(ctx, x, y, cw, rowH, 8)
    ctx.fillStyle = chip.active ? C.brass : 'rgba(255,255,255,0.09)'
    ctx.fill()
    ctx.fillStyle = chip.active ? C.paperInk : C.text
    ctx.textBaseline = 'middle'
    fitText(ctx, chip.label, x + cw / 2, y + rowH / 2 + 1, rowH <= 26 ? 15 : 20, cw - 8, { min: 9 })
    ctx.textBaseline = 'alphabetic'
  })
}

const INLAYS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])

function drawNeck(ctx, scene, assets) {
  const { neck, view, labels, noteLabel } = scene
  const x0 = 310, y0 = 494, w = 940, h = 190
  const { fretStart, fretEnd } = neck
  const cols = fretEnd - fretStart + 1
  const cw = w / cols
  const sGap = h / 6

  // View caption
  ctx.fillStyle = C.brass
  ctx.textBaseline = 'alphabetic'
  fitText(ctx, scene.viewCaption, x0, 480, 26, 820, { align: 'left' })
  if (scene.viewCount > 1) {
    ctx.fillStyle = C.dim
    fitText(ctx, `${scene.viewIndex + 1}/${scene.viewCount}`, x0 + w, 480, 24, 100, { align: 'right', weight: 'normal' })
  }

  // Board
  ctx.drawImage(assets.wood, 0, 0, 940, 210, x0, y0, w, h)
  ctx.strokeStyle = C.brassDark; ctx.lineWidth = 2
  ctx.strokeRect(x0, y0, w, h)

  // Frets / nut
  for (let i = 0; i <= cols; i++) {
    const x = x0 + i * cw
    const isNut = fretStart === 0 && i === 1
    ctx.strokeStyle = isNut ? '#efe6cf' : 'rgba(205,205,200,0.85)'
    ctx.lineWidth = isNut ? 7 : 3
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke()
  }
  // Inlays + fret numbers
  for (let f = fretStart; f <= fretEnd; f++) {
    const cx = x0 + (f - fretStart + 0.5) * cw
    if (INLAYS.has(f)) {
      ctx.fillStyle = 'rgba(240,230,205,0.28)'
      const ys = f % 12 === 0 ? [y0 + h * 0.3, y0 + h * 0.7] : [y0 + h / 2]
      for (const yy of ys) { ctx.beginPath(); ctx.arc(cx, yy, 10, 0, Math.PI * 2); ctx.fill() }
    }
    ctx.fillStyle = C.dim
    setFont(ctx, 20, 'normal'); ctx.textAlign = 'center'
    ctx.fillText(String(f), cx, y0 + h + 26)
  }
  // Strings (string 1 = top, thinnest)
  for (let s = 1; s <= 6; s++) {
    const y = y0 + (s - 0.5) * sGap
    ctx.strokeStyle = s >= 4 ? '#c9a46a' : '#e8e0d0'
    ctx.lineWidth = 1 + s * 0.45
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke()
  }
  // Dots
  const r = Math.min(cw * 0.34, sGap * 0.42, 19)
  for (const d of neck.dots) {
    const cx = x0 + (d.fret - fretStart + 0.5) * cw
    const cy = y0 + (d.string - 0.5) * sGap
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = d.role === 'chordRoot' ? C.root : d.role === 'chordTone' ? C.chord : C.scale
    ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke()
    if (view.displayMode !== 'dots') {
      ctx.fillStyle = d.role === 'scale' ? '#1a110a' : '#10161a'
      ctx.textBaseline = 'middle'
      setFont(ctx, Math.round(r * 1.05))
      ctx.textAlign = 'center'
      ctx.fillText(view.displayMode === 'degrees' ? d.degree : noteLabel(d.note), cx, cy + 1)
      ctx.textBaseline = 'alphabetic'
    }
  }
}

export function drawFrame(ctx, scene, assets, width = DESIGN_W, height = DESIGN_H) {
  ctx.save()
  ctx.setTransform(width / DESIGN_W, 0, 0, height / DESIGN_H, 0, 0)
  const g = ctx.createLinearGradient(0, 0, 0, DESIGN_H)
  g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg0)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H)
  drawSidePanel(ctx, scene, assets)
  drawChordHeader(ctx, scene)
  drawBarStrip(ctx, scene)
  drawNeck(ctx, scene, assets)
  ctx.restore()
}
