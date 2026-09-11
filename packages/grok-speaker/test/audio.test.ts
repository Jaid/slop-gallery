import {expect, test} from 'bun:test'

import {decodeBase64, decodeEnvelope, decodeTimestamps, pcmRate, toWav} from '../src/audio.ts'

const envelope = (rate = 48_000) => ({
  audio: Buffer.alloc(rate * 2).toString('base64'),
  duration: 1,
  content_type: 'audio/pcm',
  audio_timestamps: {
    graph_chars: ['H', 'i'],
    graph_times: [[0, 0.2], [0.2, 1]],
  },
})
test('writes a valid WAV without resampling or altering PCM', () => {
  const pcm = new Uint8Array([0, 1, 255, 127, 0, 128])
  const result = toWav(pcm, 48_000)
  const wav = Buffer.from(result.wav)
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
  expect(wav.readUInt32LE(4)).toBe(wav.length - 8)
  expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ')
  expect(wav.readUInt16LE(20)).toBe(1)
  expect(wav.readUInt16LE(22)).toBe(1)
  expect(wav.readUInt32LE(24)).toBe(48_000)
  expect(wav.readUInt32LE(28)).toBe(96_000)
  expect(wav.readUInt16LE(32)).toBe(2)
  expect(wav.readUInt16LE(34)).toBe(16)
  expect(wav.toString('ascii', 36, 40)).toBe('data')
  expect(wav.readUInt32LE(40)).toBe(pcm.length)
  expect(new Uint8Array(wav.subarray(44))).toEqual(pcm)
  expect(result.duration).toBe(3 / 48_000)
})
test.each([24_000, 48_000])('decodes truthful %s Hz timed PCM', rate => {
  const result = decodeEnvelope(envelope(rate), 'trace')
  expect(result.sampleRate).toBe(rate)
  expect(result.duration).toBe(1)
  expect(result.traceId).toBe('trace')
  expect(result.timestamps).toEqual([
    {
      char: 'H',
      start: 0,
      end: 0.2,
    }, {
      char: 'i',
      start: 0.2,
      end: 1,
    },
  ])
})
test('accepts timestamp pairs and objects, preserving provider alignment', () => {
  expect(decodeTimestamps({
    graph_chars: ['<', 'a'],
    graph_times: [
      {
        start: 0,
        end: 0.5,
      }, [0.5, 1],
    ],
  })).toEqual([
    {
      char: '<',
      start: 0,
      end: 0.5,
    }, {
      char: 'a',
      start: 0.5,
      end: 1,
    },
  ])
})
test.each([
  null, {}, {
    graph_chars: ['a'],
    graph_times: [],
  }, {
    graph_chars: ['a'],
    graph_times: [null],
  }, {
    graph_chars: ['a'],
    graph_times: [[1, 0]],
  }, {
    graph_chars: ['a'],
    graph_times: [[0, Infinity]],
  },
])('rejects bad alignment %j', value => {
  expect(() => decodeTimestamps(value)).toThrow()
})
test('rejects malformed base64, empty audio, truncated frames and unestablished rates', () => {
  expect(() => decodeBase64('%%%')).toThrow()
  expect(() => decodeBase64('YWJj!===')).toThrow()
  expect(() => toWav(new Uint8Array, 48_000)).toThrow()
  expect(() => toWav(new Uint8Array([1]), 48_000)).toThrow()
  expect(() => decodeEnvelope({
    ...envelope(),
    duration: 3.7,
  })).toThrow()
  expect(() => decodeEnvelope({
    ...envelope(),
    content_type: 'audio/mpeg',
  })).toThrow()
  expect(() => decodeEnvelope({
    ...envelope(),
    audio_timestamps: {
      graph_chars: ['a'],
      graph_times: [[0, 2]],
    },
  })).toThrow()
})
test('never guesses an OpenRouter streaming sample rate', () => {
  expect(pcmRate('audio/pcm;rate=24000;channels=1')).toBe(24_000)
  expect(pcmRate('audio/pcm', 48_000)).toBe(48_000)
  expect(() => pcmRate('audio/pcm')).toThrow()
  expect(() => pcmRate('audio/pcm;rate=48000;channels=2')).toThrow()
  expect(() => pcmRate('audio/mpeg')).toThrow()
})
