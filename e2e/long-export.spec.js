import { test, expect } from '@playwright/test';
import fs from 'fs';
import { execFileSync, spawnSync } from 'child_process';

// Real-time 5+ minute export of a lesson preset. Opt-in (takes ~6 minutes):
//   LONG_EXPORT=1 npx playwright test e2e/long-export.spec.js
test.skip(!process.env.LONG_EXPORT, 'set LONG_EXPORT=1 to run the real-time 5-minute export');
test.setTimeout(15 * 60 * 1000);

test('lesson preset exports a 5+ minute video with audio', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('ear-training:language', 'en'));
  await page.goto('/backing-tracks');
  await page.getByTitle('Templates').click();
  await page.getByTestId('templates-tab-lessons').click();
  await page.getByTestId('lesson-btn-1').click();
  await page.getByTestId('lesson-load-amg7-bossa').click();   // default version: two necks (octave 1-3-4 | 1-2-4)
  await page.getByTestId('open-video-export').click();
  await page.getByTestId('vx-len-5').click();
  await expect(page.getByTestId('vx-repetitions')).toHaveText('59');
  await page.getByTestId('vx-start').click();
  await expect(page.getByTestId('vx-result')).toBeVisible({ timeout: 12 * 60 * 1000 });
  const out = await page.evaluate(async () => {
    const v = document.querySelector('.vx-preview');
    const blob = await (await fetch(v.src)).blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { type: blob.type, size: blob.size, b64: btoa(bin) };
  });
  const file = process.env.LONG_EXPORT_OUT || info.outputPath(out.type.includes('mp4') ? 'long.mp4' : 'long.webm');
  fs.writeFileSync(file, Buffer.from(out.b64, 'base64'));
  console.log('LONG EXPORT', file, out.type, out.size);
  let probe = '';
  try {
    probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json', file]).toString();
    console.log(probe);
  } catch { /* ffprobe missing: size check only */ }
  expect(out.size).toBeGreaterThan(1_000_000);
  if (probe) {
    const j = JSON.parse(probe);
    expect(j.streams.map(s => s.codec_type).sort()).toEqual(['audio', 'video']);
    let dur = Number(j.format.duration);
    if (!Number.isFinite(dur)) {
      // MediaRecorder WebM has no duration header: decode and read the last timestamp.
      const log = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-f', 'null', '-']).stderr.toString();
      const times = [...String(log).matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
      if (times.length) { const [, h, m, s] = times.at(-1); dur = (+h) * 3600 + (+m) * 60 + (+s); }
    }
    console.log('DURATION_SEC', dur);
    expect(dur).toBeGreaterThan(300);
  }
});
