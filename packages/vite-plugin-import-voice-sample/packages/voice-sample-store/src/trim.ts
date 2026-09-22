import type {VoiceSampleMetadata, VoiceSampleTrimMetadata} from './types.ts'

export const defaultVoiceSampleTrimThreshold = -50
export const voiceSampleTrimMinimumSilenceSeconds = 0.02
export const voiceSampleTrimPaddingSeconds = 0.01

const canonicalWav = (wav: Uint8Array, sampleRate: number) => {
  if (wav.byteLength < 44) {
    throw new Error('Stored WAV is truncated.')
  }
  const view = Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength)
  if (
    view.toString('ascii', 0, 4) !== 'RIFF'
    || view.readUInt32LE(4) !== view.byteLength - 8
    || view.toString('ascii', 8, 12) !== 'WAVE'
    || view.toString('ascii', 12, 16) !== 'fmt '
    || view.readUInt32LE(16) !== 16
    || view.readUInt16LE(20) !== 1
    || view.readUInt16LE(22) !== 1
    || view.readUInt32LE(24) !== sampleRate
    || view.readUInt32LE(28) !== sampleRate * 2
    || view.readUInt16LE(32) !== 2
    || view.readUInt16LE(34) !== 16
    || view.toString('ascii', 36, 40) !== 'data'
    || view.readUInt32LE(40) !== view.byteLength - 44
    || (view.byteLength - 44) % 2
  ) {
    throw new Error('Trimming requires canonical mono signed 16-bit PCM WAV.')
  }
  return view
}
const wavFromPcm = (pcm: Uint8Array, sampleRate: number) => {
  const wav = Buffer.alloc(44 + pcm.byteLength)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + pcm.byteLength, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * 2, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(pcm.byteLength, 40)
  wav.set(pcm, 44)
  return Uint8Array.from(wav)
}

export const trimVoiceSample = (wav: Uint8Array, metadata: VoiceSampleMetadata, thresholdDb: number) => {
  if (!Number.isFinite(thresholdDb) || thresholdDb > 0) {
    throw new TypeError('Voice sample trimThreshold must be a finite dBFS value at or below 0.')
  }
  const view = canonicalWav(wav, metadata.sampleRate)
  const samples = (view.byteLength - 44) / 2
  const threshold = 32_768 * 10 ** (thresholdDb / 20)
  let first = 0
  let end = samples
  while (first < samples && Math.abs(view.readInt16LE(44 + first * 2)) < threshold) {
    first++
  }
  if (first === samples) {
    throw new Error('Voice sample is entirely below the trim threshold.')
  }
  while (end > first && Math.abs(view.readInt16LE(44 + (end - 1) * 2)) < threshold) {
    end--
  }
  const padding = Math.round(metadata.sampleRate * voiceSampleTrimPaddingSeconds)
  const minimumSilence = Math.ceil(metadata.sampleRate * voiceSampleTrimMinimumSilenceSeconds)
  const startSample = first >= minimumSilence ? Math.max(0, first - padding) : 0
  const endSample = samples - end >= minimumSilence ? Math.min(samples, end + padding) : samples
  const sourceDuration = samples / metadata.sampleRate
  const removedStartSeconds = startSample / metadata.sampleRate
  const removedEndSeconds = (samples - endSample) / metadata.sampleRate
  const duration = (endSample - startSample) / metadata.sampleRate
  const changed = startSample !== 0 || endSample !== samples
  const shift = (time: number) => Math.min(duration, Math.max(0, time - removedStartSeconds))
  const trim: VoiceSampleTrimMetadata = {
    changed,
    minimumSilenceSeconds: voiceSampleTrimMinimumSilenceSeconds,
    paddingSeconds: voiceSampleTrimPaddingSeconds,
    removedEndSeconds,
    removedStartSeconds,
    sourceDuration,
    thresholdDb,
  }
  const trimmedMetadata: VoiceSampleMetadata = {
    duration,
    sampleRate: metadata.sampleRate,
    timings: metadata.timings.map(timing => ({
      char: timing.char,
      end: shift(timing.end),
      start: shift(timing.start),
    })),
    trim,
    ...metadata.traceId ? {traceId: metadata.traceId} : {},
  }
  const trimmedWav = changed ? wavFromPcm(Uint8Array.from(view.subarray(44 + startSample * 2, 44 + endSample * 2)), metadata.sampleRate) : Uint8Array.from(wav)
  return {
    metadata: trimmedMetadata,
    wav: trimmedWav,
  }
}
