import type {GeneratedSpeech} from 'grok-speaker'

import pcmWave from '../../../src/lib/audio/pcmWave.ts'

const thresholdDb = -50
const paddingSeconds = 0.01
const minimumSilenceSeconds = 0.02

/** Trim only quiet edges of GrokSpeaker’s canonical mono PCM WAV; never remove internal pauses. */
export default async function trimVoice(source: GeneratedSpeech) {
  const wave = Buffer.from(source.wav)
  if (wave.length < 46 || wave.toString('ascii', 0, 4) !== 'RIFF' || wave.readUInt32LE(4) !== wave.length - 8 || wave.toString('ascii', 8, 16) !== 'WAVEfmt ' || wave.readUInt32LE(16) !== 16 || wave.readUInt16LE(20) !== 1 || wave.readUInt16LE(22) !== 1 || wave.readUInt32LE(24) !== source.sampleRate || wave.readUInt32LE(28) !== source.sampleRate * 2 || wave.readUInt16LE(32) !== 2 || wave.readUInt16LE(34) !== 16 || wave.toString('ascii', 36, 40) !== 'data' || wave.readUInt32LE(40) !== wave.length - 44 || (wave.length - 44) % 2) {
    throw new Error('Trimming requires GrokSpeaker’s mono signed 16-bit PCM WAV.')
  }
  const samples = (wave.length - 44) / 2
  if (!Number.isSafeInteger(source.sampleRate) || source.sampleRate <= 0 || !Number.isFinite(source.duration) || Math.abs(source.duration - samples / source.sampleRate) > 1 / source.sampleRate) {
    throw new Error('PCM length does not match the reported speech duration.')
  }
  const threshold = 32_768 * 10 ** (thresholdDb / 20)
  let first = 0
  let end = samples
  while (first < samples && Math.abs(wave.readInt16LE(44 + first * 2)) < threshold) {
    first++
  }
  if (first === samples) {
    throw new Error('Speech is entirely below the silence threshold; refusing an empty render.')
  }
  while (end > first && Math.abs(wave.readInt16LE(44 + (end - 1) * 2)) < threshold) {
    end--
  }
  const padding = Math.round(source.sampleRate * paddingSeconds)
  const minimumSilence = Math.ceil(source.sampleRate * minimumSilenceSeconds)
  const startSample = first >= minimumSilence ? Math.max(0, first - padding) : 0
  const endSample = samples - end >= minimumSilence ? Math.min(samples, end + padding) : samples
  const removedStartSeconds = startSample / source.sampleRate
  const removedEndSeconds = (samples - endSample) / source.sampleRate
  const duration = (endSample - startSample) / source.sampleRate
  const changed = startSample !== 0 || endSample !== samples
  const trim = {
    changed,
    thresholdDb,
    paddingSeconds,
    minimumSilenceSeconds,
    startSample,
    endSample,
    removedStartSeconds,
    removedEndSeconds,
    sourceDuration: source.duration,
    outputDuration: duration,
  }
  if (!changed) {
    return {
      audio: source,
      trim,
    }
  }
  const pcm = Uint8Array.from(wave.subarray(44 + startSample * 2, 44 + endSample * 2)).buffer
  const wav = new Uint8Array(await pcmWave(pcm, source.sampleRate).arrayBuffer())
  const shift = (time: number) => Math.min(duration, Math.max(0, time - removedStartSeconds))
  const audio: GeneratedSpeech = {
    ...source,
    wav,
    duration,
    // Keep every provider character, including markup. Outside intervals collapse to an edge.
    timestamps: source.timestamps.map(time => ({
      ...time,
      start: shift(time.start),
      end: shift(time.end),
    })),
  }
  return {
    audio,
    trim,
  }
}
