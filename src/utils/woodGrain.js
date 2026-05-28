// Deterministic pseudo-random — same seed yields same pattern.
// Mulberry32 — small, fast, good enough for grain noise.
// Ported from C:/Users/DELL/Documents/fretboard-realtime/src/fretboard/woodGrain.ts

export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawRosewoodBackground(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2d1810');
  g.addColorStop(0.45, '#5a3525');
  g.addColorStop(0.55, '#5a3525');
  g.addColorStop(1, '#2d1810');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export function drawWoodGrain(ctx, x, y, w, h, seed = 1337, density = 90) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < density; i++) {
    const gx = x + rand() * w;
    const alpha = 0.04 + rand() * 0.09;
    const dark = rand() < 0.5;
    ctx.strokeStyle = dark
      ? `rgba(20,10,5,${alpha.toFixed(3)})`
      : `rgba(120,80,55,${(alpha * 0.6).toFixed(3)})`;
    const jitter = (rand() - 0.5) * 6;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + jitter, y + h);
    ctx.stroke();
  }
  ctx.lineWidth = 1.4;
  const featureCount = Math.max(4, Math.floor(density / 12));
  for (let i = 0; i < featureCount; i++) {
    const gx = x + rand() * w;
    const alpha = 0.12 + rand() * 0.08;
    ctx.strokeStyle = `rgba(15,8,4,${alpha.toFixed(3)})`;
    const jitter = (rand() - 0.5) * 10;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + jitter, y + h);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Dark wood table surface — meant to sit behind the fretboard and look like
 * a polished ebony/wenge desk.
 */
export function drawDarkWoodTable(ctx, w, h) {
  const baseG = ctx.createLinearGradient(0, 0, 0, h);
  baseG.addColorStop(0, '#1a130a');
  baseG.addColorStop(0.4, '#241a10');
  baseG.addColorStop(0.6, '#1f1709');
  baseG.addColorStop(1, '#150f08');
  ctx.fillStyle = baseG;
  ctx.fillRect(0, 0, w, h);

  const rand = mulberry32(7777);
  ctx.save();

  const boardCount = Math.max(3, Math.floor(h / 120));
  for (let i = 0; i < boardCount; i++) {
    const y = (i + 0.5) * (h / boardCount) + (rand() - 0.5) * 20;
    const g = ctx.createLinearGradient(0, y - 4, 0, y + 4);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 4, w, 8);
  }

  const numGrains = Math.max(60, Math.floor(h * 0.7));
  ctx.lineWidth = 1;
  for (let i = 0; i < numGrains; i++) {
    const y = rand() * h;
    const alpha = 0.10 + rand() * 0.14;
    const roll = rand();
    if (roll < 0.4) {
      ctx.strokeStyle = `rgba(110,72,42,${alpha.toFixed(3)})`;
    } else if (roll < 0.55) {
      ctx.strokeStyle = `rgba(160,110,72,${(alpha * 0.7).toFixed(3)})`;
    } else {
      ctx.strokeStyle = `rgba(0,0,0,${(alpha * 1.6).toFixed(3)})`;
    }
    const wave = 14 + rand() * 12;
    const phase = rand() * Math.PI * 2;
    const amp = 1 + rand() * 2.5;
    ctx.beginPath();
    for (let xp = 0; xp <= w; xp += 6) {
      const yy = y + Math.sin(xp / wave + phase) * amp;
      if (xp === 0) ctx.moveTo(xp, yy);
      else ctx.lineTo(xp, yy);
    }
    ctx.stroke();
  }

  ctx.lineWidth = 1.8;
  const featureCount = Math.max(8, Math.floor(h / 50));
  for (let i = 0; i < featureCount; i++) {
    const y = rand() * h;
    const alpha = 0.22 + rand() * 0.18;
    ctx.strokeStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
    const wave = 22 + rand() * 18;
    const phase = rand() * Math.PI * 2;
    const amp = 2 + rand() * 3.5;
    ctx.beginPath();
    for (let xp = 0; xp <= w; xp += 6) {
      const yy = y + Math.sin(xp / wave + phase) * amp;
      if (xp === 0) ctx.moveTo(xp, yy);
      else ctx.lineTo(xp, yy);
    }
    ctx.stroke();
  }

  ctx.restore();
  drawWoodVignette(ctx, 0, 0, w, h);
}

export function drawWoodVignette(ctx, x, y, w, h) {
  if (w <= 0 || h <= 0) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const inner = Math.max(0, Math.min(w, h) * 0.25);
  const outer = Math.max(inner + 1, Math.hypot(w, h) * 0.55);
  const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
