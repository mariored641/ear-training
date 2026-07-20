import * as Tone from 'tone';

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
export function audioBufferToWav(buffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const dataLength = frames * channels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderMix(tracks, duration, excludeTrackIds = []) {
  const excluded = new Set(excludeTrackIds);
  const eligible = tracks.filter((track) => !track.muted && !excluded.has(track.id));
  const hasSolo = eligible.some((track) => track.soloed);
  const included = hasSolo ? eligible.filter((track) => track.soloed) : eligible;
  if (!included.length) throw new Error('יש לבחור לפחות שכבה אחת לייצוא.');

  const sampleRate = Math.min(48000, included[0].audioData?.sampleRate || 44100);
  const rendered = await Tone.Offline(() => {
    included.forEach((track) => {
      const gain = new Tone.Gain(Math.max(0, Math.min(1, track.volume)));
      const panner = new Tone.Panner(Math.max(-1, Math.min(1, track.pan)));
      gain.connect(panner);
      panner.toDestination();
      const player = new Tone.Player({
        url: track.audioData,
        loop: false,
        fadeIn: 0,
        fadeOut: 0,
      }).connect(gain);
      player.start(0, 0, duration);
    });
  }, duration, 2, sampleRate);

  const audioBuffer = rendered.get();
  if (!audioBuffer) throw new Error('יצירת קובץ האודיו נכשלה.');
  return audioBufferToWav(audioBuffer);
}
