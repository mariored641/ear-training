const WORKLET_BATCH_SIZE = 1024;
const LOOP_FADE_SECONDS = 0.005;
const CAPTURE_PROCESSOR_NAME = `looper-capture-${Math.random().toString(36).slice(2)}`;
const workletPromises = new WeakMap();

const CAPTURE_WORKLET_SOURCE = `
class LooperCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batchSize = ${WORKLET_BATCH_SIZE};
    this.buffers = null;
    this.offset = 0;
    this.batchStartFrame = 0;
    this.port.onmessage = (event) => {
      if (event.data?.type === 'flush') this.flush();
    };
  }

  ensureBuffers(channelCount) {
    if (!this.buffers || this.buffers.length !== channelCount) {
      this.buffers = Array.from({ length: channelCount }, () => new Float32Array(this.batchSize));
      this.offset = 0;
    }
  }

  flush() {
    if (!this.buffers || !this.offset) return;
    const channels = this.buffers.map((buffer) => buffer.slice(0, this.offset));
    this.port.postMessage(
      { type: 'audio', frame: this.batchStartFrame, channels },
      channels.map((channel) => channel.buffer),
    );
    this.buffers = Array.from({ length: channels.length }, () => new Float32Array(this.batchSize));
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length || !input[0]?.length) return true;
    const channelCount = Math.min(2, input.length);
    this.ensureBuffers(channelCount);
    const blockLength = input[0].length;
    let sourceOffset = 0;

    while (sourceOffset < blockLength) {
      if (this.offset === 0) this.batchStartFrame = currentFrame + sourceOffset;
      const copyLength = Math.min(this.batchSize - this.offset, blockLength - sourceOffset);
      for (let channel = 0; channel < channelCount; channel += 1) {
        this.buffers[channel].set(
          input[channel].subarray(sourceOffset, sourceOffset + copyLength),
          this.offset,
        );
      }
      this.offset += copyLength;
      sourceOffset += copyLength;
      if (this.offset === this.batchSize) this.flush();
    }
    return true;
  }
}
registerProcessor('${CAPTURE_PROCESSOR_NAME}', LooperCaptureProcessor);
`;

function microphoneError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return new Error('נדרשת הרשאת מיקרופון כדי להקליט שכבות.');
  }
  if (error?.name === 'NotFoundError') {
    return new Error('לא נמצא מיקרופון זמין במכשיר.');
  }
  return new Error(error?.message || 'לא ניתן לפתוח את המיקרופון.');
}

function pickRecordingMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
  ];
  return candidates.find((mime) => {
    try { return MediaRecorder.isTypeSupported(mime); } catch { return false; }
  }) || '';
}

async function ensureCaptureWorklet(context) {
  const rawContext = context.rawContext || context;
  if (!rawContext.audioWorklet || typeof context.createAudioWorkletNode !== 'function') return false;
  if (!workletPromises.has(context)) {
    const modulePromise = (async () => {
      const blob = new Blob([CAPTURE_WORKLET_SOURCE], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      try {
        await rawContext.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
    workletPromises.set(context, modulePromise);
  }
  await workletPromises.get(context);
  return true;
}

/**
 * Captures microphone PCM against the AudioContext sample clock. AudioWorklet
 * batches are cropped/padded to the shared loop duration before playback, so
 * every layer starts at the same frame and cannot accumulate drift.
 */
export class MicrophoneRecorder {
  constructor(context) {
    this.context = context;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.processor = null;
    this.silentGain = null;
    this.capture = null;
    this.levelData = null;
    this.mode = null;
  }

  async open() {
    if (this.stream?.active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('הדפדפן הזה אינו תומך בהקלטת מיקרופון.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: { ideal: 2 },
        },
      });
    } catch (error) {
      throw microphoneError(error);
    }

    this.source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.72;
    this.levelData = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    if (await ensureCaptureWorklet(this.context)) {
      this.mode = 'worklet';
      this.processor = this.context.createAudioWorkletNode(CAPTURE_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        outputChannelCount: [2],
      });
      this.processor.port.onmessage = (event) => {
        if (event.data?.type === 'audio') this.#processBlock(event.data.channels, event.data.frame);
      };
      this.silentGain = this.context.createGain();
      this.silentGain.gain.value = 0;
      this.source.connect(this.processor);
      this.processor.connect(this.silentGain);
      this.silentGain.connect((this.context.rawContext || this.context).destination);
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('הדפדפן הזה אינו תומך במנוע ההקלטה הנדרש.');
    }
    this.mode = 'media-recorder';
  }

  begin(startTime) {
    if (!this.mode) throw new Error('המיקרופון עדיין לא מוכן.');
    if (this.capture) throw new Error('כבר מתבצעת הקלטה.');
    this.capture = {
      startTime,
      stopTime: null,
      channelChunks: [],
      channelCount: 0,
      lastCapturedTime: startTime,
      resolve: null,
      timeoutId: null,
      mediaRecorder: null,
      mediaChunks: [],
      mediaStartTimer: null,
      mediaResolve: null,
      mediaReject: null,
      mediaDone: null,
    };

    if (this.mode === 'media-recorder') this.#beginMediaRecorder(this.capture);
  }

  #beginMediaRecorder(capture) {
    capture.mediaDone = new Promise((resolve, reject) => {
      capture.mediaResolve = resolve;
      capture.mediaReject = reject;
    });
    const delayMs = Math.max(0, (capture.startTime - this.context.currentTime) * 1000);
    capture.mediaStartTimer = window.setTimeout(() => {
      try {
        const mimeType = pickRecordingMime();
        const recorder = mimeType
          ? new MediaRecorder(this.stream, { mimeType })
          : new MediaRecorder(this.stream);
        capture.mediaRecorder = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data?.size) capture.mediaChunks.push(event.data);
        };
        recorder.onerror = (event) => capture.mediaReject(event.error || new Error('Recording failed'));
        recorder.onstop = () => {
          const type = recorder.mimeType || capture.mediaChunks[0]?.type || 'audio/webm';
          capture.mediaResolve(new Blob(capture.mediaChunks, { type }));
        };
        recorder.start(100);
      } catch (error) {
        capture.mediaReject(error);
      }
    }, delayMs);
  }

  async stopAt(endTime, targetDurationSeconds) {
    const capture = this.capture;
    if (!capture) throw new Error('אין הקלטה פעילה.');
    capture.stopTime = Math.max(capture.startTime, endTime);

    if (this.mode === 'media-recorder') {
      const delayMs = Math.max(0, (capture.stopTime - this.context.currentTime) * 1000);
      if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      if (capture.mediaRecorder?.state !== 'inactive') capture.mediaRecorder?.stop();
      const blob = await capture.mediaDone;
      const decoded = await this.context.decodeAudioData(await blob.arrayBuffer());
      const buffer = this.#fitDecodedBuffer(decoded, targetDurationSeconds);
      this.capture = null;
      return buffer;
    }

    if (capture.lastCapturedTime < capture.stopTime) {
      await new Promise((resolve) => {
        capture.resolve = resolve;
        capture.timeoutId = window.setTimeout(resolve, 700);
      });
    }

    if (capture.timeoutId) window.clearTimeout(capture.timeoutId);
    const buffer = this.#buildBuffer(capture, targetDurationSeconds);
    this.capture = null;
    return buffer;
  }

  cancel() {
    const capture = this.capture;
    if (!capture) return;
    if (capture.timeoutId) window.clearTimeout(capture.timeoutId);
    if (capture.mediaStartTimer) window.clearTimeout(capture.mediaStartTimer);
    if (capture.mediaRecorder?.state && capture.mediaRecorder.state !== 'inactive') {
      try { capture.mediaRecorder.stop(); } catch {}
    }
    capture.resolve?.();
    this.capture = null;
  }

  getInputLevel() {
    if (!this.analyser || !this.levelData) return 0;
    this.analyser.getFloatTimeDomainData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i += 1) {
      sum += this.levelData[i] * this.levelData[i];
    }
    const rms = Math.sqrt(sum / this.levelData.length);
    return Math.min(1, rms * 4.5);
  }

  #processBlock(channels, startFrame) {
    const capture = this.capture;
    if (!capture || !channels?.length || !channels[0]?.length) return;
    const sampleRate = this.context.sampleRate;
    const length = channels[0].length;
    const blockStart = startFrame / sampleRate;
    const blockEnd = blockStart + (length / sampleRate);
    const captureEnd = capture.stopTime ?? Number.POSITIVE_INFINITY;

    if (blockEnd <= capture.startTime) return;
    if (blockStart >= captureEnd) {
      capture.lastCapturedTime = blockStart;
      capture.resolve?.();
      return;
    }

    const from = Math.max(0, Math.floor((capture.startTime - blockStart) * sampleRate));
    const to = Math.min(length, Math.ceil((captureEnd - blockStart) * sampleRate));
    if (to <= from) return;

    const channelCount = Math.max(1, Math.min(2, channels.length));
    if (!capture.channelCount) {
      capture.channelCount = channelCount;
      capture.channelChunks = Array.from({ length: channelCount }, () => []);
    }
    for (let channel = 0; channel < capture.channelCount; channel += 1) {
      const sourceChannel = channels[Math.min(channel, channels.length - 1)];
      capture.channelChunks[channel].push(sourceChannel.slice(from, to));
    }

    capture.lastCapturedTime = blockStart + (to / sampleRate);
    if (capture.stopTime !== null && blockEnd >= capture.stopTime) capture.resolve?.();
  }

  #fitDecodedBuffer(decoded, targetDurationSeconds) {
    const capture = {
      channelCount: Math.min(2, decoded.numberOfChannels),
      channelChunks: Array.from(
        { length: Math.min(2, decoded.numberOfChannels) },
        (_, channel) => [decoded.getChannelData(channel)],
      ),
    };
    return this.#buildBuffer(capture, targetDurationSeconds);
  }

  #buildBuffer(capture, targetDurationSeconds) {
    const sampleRate = this.context.sampleRate;
    const targetLength = Math.max(1, Math.round(targetDurationSeconds * sampleRate));
    const channelCount = capture.channelCount || 1;
    const output = this.context.createBuffer(channelCount, targetLength, sampleRate);

    for (let channel = 0; channel < channelCount; channel += 1) {
      const destination = output.getChannelData(channel);
      let offset = 0;
      for (const chunk of capture.channelChunks[channel] || []) {
        if (offset >= targetLength) break;
        const remaining = targetLength - offset;
        destination.set(chunk.length > remaining ? chunk.subarray(0, remaining) : chunk, offset);
        offset += Math.min(chunk.length, remaining);
      }
    }

    const fadeSamples = Math.min(
      Math.floor(sampleRate * LOOP_FADE_SECONDS),
      Math.floor(targetLength / 4),
    );
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = output.getChannelData(channel);
      for (let i = 0; i < fadeSamples; i += 1) {
        const gain = i / Math.max(1, fadeSamples - 1);
        data[i] *= gain;
        data[targetLength - 1 - i] *= gain;
      }
    }

    return output;
  }

  dispose() {
    this.cancel();
    try { this.processor?.port?.postMessage({ type: 'flush' }); } catch {}
    if (this.processor?.port) this.processor.port.onmessage = null;
    try { this.source?.disconnect(); } catch {}
    try { this.analyser?.disconnect(); } catch {}
    try { this.processor?.disconnect(); } catch {}
    try { this.silentGain?.disconnect(); } catch {}
    for (const track of this.stream?.getTracks?.() || []) track.stop();
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.processor = null;
    this.silentGain = null;
    this.mode = null;
  }
}

export function calculateWaveformPeaks(buffer, peakCount = 160) {
  if (!buffer?.length) return [];
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / peakCount));
  const peaks = [];
  for (let i = 0; i < peakCount; i += 1) {
    const start = i * blockSize;
    const end = Math.min(channel.length, start + blockSize);
    let peak = 0;
    for (let sample = start; sample < end; sample += 1) {
      peak = Math.max(peak, Math.abs(channel[sample]));
    }
    peaks.push(peak);
  }
  return peaks;
}
