import type {GeneratedSpeech} from 'grok-speaker'

import {expect, test} from 'bun:test'

import trimVoice from '../../scripts/lib/voice/trimVoice.ts'
import pcmWave from '../../src/lib/audio/pcmWave.ts'

const speech = async (parts: Array<[number, number]>, timestamps: GeneratedSpeech['timestamps'] = []): Promise<GeneratedSpeech> => {
  const samples = Int16Array.from(parts.flatMap(([milliseconds, value]) => Array.from({length: milliseconds * 48}, () => value)))
  return {
    wav: new Uint8Array(await pcmWave(samples.buffer, 48_000).arrayBuffer()),
    sampleRate: 48_000,
    duration: samples.length / 48_000,
    timestamps,
    traceId: 'provider',
  }
}
test('trims only outer silence, retains padding and preserves internal pauses byte-for-byte', async () => {
  const source = await speech([[100, 0], [100, 5000], [100, 0], [100, -5000], [100, 0]])
  const original = Uint8Array.from(source.wav)
  const {audio, trim} = await trimVoice(source)
  expect(trim).toMatchObject({
    changed: true,
    startSample: 4320,
    endSample: 19_680,
    removedStartSeconds: 0.09,
    removedEndSeconds: 0.09,
    sourceDuration: 0.5,
    outputDuration: 0.32,
  })
  expect(audio.duration).toBe(0.32)
  expect(audio.wav.subarray(44)).toEqual(source.wav.subarray(44 + 4320 * 2, 44 + 19_680 * 2))
  expect(source.wav).toEqual(original)
  expect(Buffer.from(audio.wav).readUInt32LE(40)).toBe(audio.wav.length - 44)
  expect(audio.traceId).toBe('provider')
})
test('shifts timestamps and clamps removed intervals without deleting provider characters', async () => {
  const timestamps = [
    {
      char: '<',
      start: 0,
      end: 0.05,
    }, {
      char: 'a',
      start: 0.08,
      end: 0.15,
    }, {
      char: 'b',
      start: 0.2,
      end: 0.4,
    }, {
      char: '>',
      start: 0.45,
      end: 0.5,
    },
  ]
  const source = await speech([[100, 0], [300, 5000], [100, 0]], timestamps)
  const {audio} = await trimVoice(source)
  expect(audio.timestamps.map(time => time.char)).toEqual(['<', 'a', 'b', '>'])
  expect(audio.timestamps[0]).toEqual({
    char: '<',
    start: 0,
    end: 0,
  })
  expect(audio.timestamps[1].start).toBe(0)
  expect(audio.timestamps[1].end).toBeCloseTo(0.06)
  expect(audio.timestamps[2].start).toBeCloseTo(0.11)
  expect(audio.timestamps[2].end).toBeCloseTo(0.31)
  expect(audio.timestamps[3]).toEqual({
    char: '>',
    start: 0.32,
    end: 0.32,
  })
  expect(source.timestamps).toEqual(timestamps)
})
test('short quiet edges are untouched and already tight audio is not copied or shifted', async () => {
  for (const parts of [[[0, 0], [30, 5000]], [[10, 0], [30, 5000], [19, 0]]] as Array<Array<[number, number]>>) {
    const source = await speech(parts)
    const result = await trimVoice(source)
    expect(result.audio).toBe(source)
    expect(result.trim.changed).toBe(false)
  }
})
test('trims either edge independently and uses an absolute threshold for both sample signs', async () => {
  const leading = await trimVoice(await speech([[50, 100], [50, -104]]))
  expect(leading.trim.removedStartSeconds).toBe(0.04)
  expect(leading.trim.removedEndSeconds).toBe(0)
  const trailing = await trimVoice(await speech([[50, 104], [50, -100]]))
  expect(trailing.trim.removedStartSeconds).toBe(0)
  expect(trailing.trim.removedEndSeconds).toBe(0.04)
})
test('entirely silent or below-threshold audio fails instead of becoming an empty Opus', async () => {
  await expect(trimVoice(await speech([[100, 0]]))).rejects.toThrow('entirely below')
  await expect(trimVoice(await speech([[100, 100]]))).rejects.toThrow('entirely below')
})
test('rejects unsupported WAV layouts, truncated PCM and inconsistent durations', async () => {
  const source = await speech([[100, 5000]])
  await expect(trimVoice({
    ...source,
    wav: source.wav.subarray(0, 30),
  })).rejects.toThrow('PCM WAV')
  await expect(trimVoice({
    ...source,
    wav: source.wav.subarray(0, -1),
  })).rejects.toThrow('PCM WAV')
  await expect(trimVoice({
    ...source,
    duration: 1,
  })).rejects.toThrow('duration')
  const stereo = Buffer.from(source.wav)
  stereo.writeUInt16LE(2, 22)
  await expect(trimVoice({
    ...source,
    wav: stereo,
  })).rejects.toThrow('PCM WAV')
})
