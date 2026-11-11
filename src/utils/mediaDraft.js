import { readLastState, writeLastState, stateKey } from './stateStore.js';

const generations = new Map();

// Binary drafts use the same versioned localStorage namespace. No object URLs
// (which die on reload) are persisted; named presets are never evicted for space.
export function readMediaDraft(id) {
  try {
    const saved = readLastState(id, 1, { dataUrl: '', mimeType: '', durationSec: 0 });
    if (!saved.dataUrl.startsWith('data:')) return null;
    const encoded = saved.dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    return { blob: new Blob([bytes], { type: saved.mimeType }), mimeType: saved.mimeType, durationSec: saved.durationSec };
  } catch { return null; }
}

export async function saveMediaDraft(id, blob, metadata = {}) {
  const generation = (generations.get(id) || 0) + 1;
  generations.set(id, generation);
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    const dataUrl = `data:${blob.type};base64,${btoa(binary)}`;
    if (generations.get(id) !== generation) return false;
    writeLastState(id, 1, { ...metadata, mimeType: metadata.mimeType || blob.type, dataUrl });
    return readLastState(id, 1, { dataUrl: '' }).dataUrl === dataUrl;
  } catch { return false; }
}

export function clearMediaDraft(id) {
  generations.set(id, (generations.get(id) || 0) + 1);
  try { localStorage.removeItem(stateKey(id)); } catch {}
}
