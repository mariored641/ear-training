import { test, expect } from '@playwright/test';

// Faster-than-real-time renderer used for the lesson video batch (scripts/batch-export-lesson-videos.mjs).
test.setTimeout(180000);

test('offline export: exact repetitions, intro → main → ending, frames cover the audio, audible', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { lessonPreset } = await import('/src/data/lessonBackingTracks.js');
    const { prepareEngine, driveOffline, renderAudio } = await import('/src/lib/video-export/offlineExport.js');
    const p = lessonPreset(5, 'cfg-country');
    const { engine, beatsPerBar } = await prepareEngine(p);
    const run = driveOffline(engine, { tempo: p.tempo, beatsPerBar, repetitions: 3 });
    const phases = [...new Set(run.beats.map(b => b.phase))];
    const mainBeats = run.beats.filter(b => b.phase === 'main').length;
    const { left } = await renderAudio(run.events, run.endSec + 1.5, 24000);
    let peak = 0; for (let i = 0; i < left.length; i += 7) peak = Math.max(peak, Math.abs(left[i]));
    return {
      phases, mainBeats, progBeats: engine._totalProgBeats, endSec: run.endSec, beatSec: run.beatSec,
      lastLoop: run.beats.at(-1).loopCount, firstT: run.beats[0].t, events: run.events.length,
      eventsAfterEnd: run.events.filter(e => e.type === 'on' && e.t > run.endSec + 1e-6).length,
      samples: left.length, peak,
    };
  });
  expect(r.phases[0]).toBe('intro');
  expect(r.phases).toContain('main');
  expect(r.phases.at(-1)).toBe('ending');
  expect(r.mainBeats).toBe(3 * r.progBeats);          // exactly 3 repetitions of the progression
  expect(r.lastLoop).toBe(3);                         // the ending follows repetition 3
  expect(r.firstT).toBe(0);
  expect(r.eventsAfterEnd).toBe(0);
  expect(r.events).toBeGreaterThan(100);
  expect(r.samples).toBe(Math.ceil((r.endSec + 1.5) * 24000));
  expect(r.peak).toBeGreaterThan(0.05);                // not silent
});
