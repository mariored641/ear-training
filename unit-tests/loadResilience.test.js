import test from 'node:test'
import assert from 'node:assert/strict'
import { withRetry, isTransient, looksLikeSoundFont, SoundLoadError } from '../src/lib/soundfont/loadResilience.js'

test('withRetry succeeds after transient failures', async () => {
  let calls = 0
  const retries = []
  const result = await withRetry(async (attempt) => {
    calls++
    if (attempt < 2) throw new SoundLoadError('network')
    return 'ok'
  }, { delays: [1, 1], onRetry: (_e, a) => retries.push(a) })
  assert.equal(result, 'ok')
  assert.equal(calls, 3)
  assert.deepEqual(retries, [0, 1])
})

test('withRetry gives up after all attempts and rethrows the last error', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(async () => { calls++; throw new SoundLoadError('down') }, { delays: [1, 1] }),
    /down/,
  )
  assert.equal(calls, 3)
})

test('withRetry does not retry permanent errors (404)', async () => {
  let calls = 0
  await assert.rejects(
    withRetry(async () => { calls++; throw new SoundLoadError('nf', { status: 404 }) }, { delays: [1, 1] }),
  )
  assert.equal(calls, 1)
})

test('isTransient classification', () => {
  assert.equal(isTransient(new SoundLoadError('x', { status: 503 })), true)
  assert.equal(isTransient(new SoundLoadError('x', { status: 429 })), true)
  assert.equal(isTransient(new SoundLoadError('x', { status: 403 })), false)
  assert.equal(isTransient(new SoundLoadError('x', { fatal: true })), false)
  assert.equal(isTransient(new Error('network')), true)
})

test('looksLikeSoundFont detects RIFF/sfbk header and rejects HTML', () => {
  const ok = new Uint8Array(16)
  ok.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x73, 0x66, 0x62, 0x6b])
  assert.equal(looksLikeSoundFont(ok.buffer), true)
  const html = new TextEncoder().encode('<!doctype html><html></html>')
  assert.equal(looksLikeSoundFont(html.buffer), false)
  assert.equal(looksLikeSoundFont(new ArrayBuffer(4)), false)
})
