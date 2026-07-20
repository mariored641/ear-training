const DB_NAME = 'ear-training-looper';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const LATEST_KEY = 'latest';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function serializeBuffer(buffer) {
  if (!buffer) return null;
  return {
    sampleRate: buffer.sampleRate,
    length: buffer.length,
    channels: Array.from({ length: buffer.numberOfChannels }, (_, channel) => {
      const copy = new Float32Array(buffer.length);
      copy.set(buffer.getChannelData(channel));
      return copy.buffer;
    }),
  };
}

function deserializeBuffer(data) {
  if (!data?.channels?.length || !data.length) return null;
  const buffer = new AudioBuffer({
    length: data.length,
    numberOfChannels: data.channels.length,
    sampleRate: data.sampleRate,
  });
  data.channels.forEach((channelBuffer, channel) => {
    buffer.copyToChannel(new Float32Array(channelBuffer), channel);
  });
  return buffer;
}

export async function saveSession(session) {
  const db = await openDatabase();
  const payload = {
    ...session,
    tracks: session.tracks.map((track) => ({
      ...track,
      audioData: serializeBuffer(track.audioData),
    })),
  };
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).put(payload, LATEST_KEY);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

export async function loadLatestSession() {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const payload = await requestAsPromise(transaction.objectStore(STORE_NAME).get(LATEST_KEY));
  db.close();
  if (!payload) return null;
  return {
    ...payload,
    tracks: (payload.tracks || []).map((track) => ({
      ...track,
      audioData: deserializeBuffer(track.audioData),
    })).filter((track) => track.audioData),
  };
}

export async function clearStoredSession() {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(LATEST_KEY);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
