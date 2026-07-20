/**
 * @typedef {Object} LooperTrack
 * @property {string} id
 * @property {number} order
 * @property {string} label
 * @property {AudioBuffer} audioData
 * @property {number} volume
 * @property {number} pan
 * @property {boolean} muted
 * @property {boolean} soloed
 * @property {number[]} waveformPeaks
 */

/**
 * @typedef {Object} LooperSession
 * @property {string} id
 * @property {number} bpm
 * @property {[number, number]} timeSignature
 * @property {number} countInBars
 * @property {number} clickVolume
 * @property {number} loopLengthBars
 * @property {LooperTrack[]} tracks
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const MAX_TRACKS = 6;
export const MAX_LOOP_BARS = 8;
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function createSession() {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() || `looper-${Date.now()}`,
    bpm: 92,
    timeSignature: [4, 4],
    countInBars: 1,
    clickVolume: 0.65,
    loopLengthBars: 0,
    tracks: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function createTrack(id, order, label) {
  return {
    id,
    order,
    label: label || `שכבה ${order + 1}`,
    audioData: null,
    volume: 0.8,
    pan: 0,
    muted: false,
    soloed: false,
    waveformPeaks: [],
  };
}
