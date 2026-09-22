import {afterEach, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'

import prerenderVoice, {parsePrerenderVoiceArgs} from '../../scripts/prerenderVoice.ts'

const roots: Array<string> = []
const temporaryRoot = async () => {
  const root = await fs.mkdtemp(path.resolve(tmpdir(), 'prerender-voice-'))
  roots.push(root)
  return root
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => fs.remove(root)))
})
const response = () => {
  const sampleRate = 24_000
  const pcm = Buffer.alloc(Math.round(sampleRate * 0.1) * 2)
  for (let offset = 0; offset < pcm.length; offset += 2) {
    pcm.writeInt16LE(5000, offset)
  }
  return Response.json({
    audio: pcm.toBase64(),
    duration: 0.1,
    content_type: 'audio/pcm',
    audio_timestamps: {
      graph_chars: ['H', 'i'],
      graph_times: [[0, 0.05], [0.05, 0.1]],
    },
  }, {headers: {'x-generation-id': 'provider-trace'}})
}
test('CLI parses shared store options', () => {
  expect(parsePrerenderVoiceArgs(['--input', 'Hi'])).toEqual({
    bitrate: undefined,
    input: 'Hi',
    output: undefined,
    sampleRate: undefined,
    trim: true,
    trimThreshold: undefined,
  })
  expect(parsePrerenderVoiceArgs([
    '--input',
    'Hi',
    '--output',
    'hello.opus',
    '--bitrate',
    '20000',
    '--sample-rate',
    '48000',
    '--no-trim',
    '--trim-threshold=-60',
  ])).toEqual({
    bitrate: 20_000,
    input: 'Hi',
    output: 'hello.opus',
    sampleRate: 48_000,
    trim: false,
    trimThreshold: -60,
  })
  expect(parsePrerenderVoiceArgs(['--help'])).toBeUndefined()
  expect(() => parsePrerenderVoiceArgs([])).toThrow('--input is required')
  expect(() => parsePrerenderVoiceArgs(['--input', 'Hi', '--sample-rate', '0'])).toThrow('positive')
  expect(() => parsePrerenderVoiceArgs(['--input', 'Hi', '--trim-threshold=1'])).toThrow('dBFS')
})
test('prepares loud Iris through VoiceSampleStore and publishes a collision-safe Opus copy', async () => {
  const root = await temporaryRoot()
  const calls: Array<Record<string, unknown>> = []
  const headers: Array<Headers> = []
  const fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof init?.body !== 'string') {
      throw new TypeError('Expected JSON request body.')
    }
    calls.push(JSON.parse(init.body) as Record<string, unknown>)
    headers.push(new Headers(init.headers))
    return response()
  }
  const options = {
    apiKey: 'test-key',
    fetch,
    input: 'Hi',
    output: 'voice.opus',
    rootFolder: root,
  }
  const first = await prerenderVoice(options)
  const second = await prerenderVoice(options)
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    input: '<loud>Hi</loud>',
    model: 'x-ai/grok-voice-tts-1.0',
    voice: 'iris',
    provider: {
      options: {
        xai: {
          language: 'en',
          output_format: {
            codec: 'pcm',
            sample_rate: 24_000,
          },
          with_timestamps: true,
        },
      },
    },
  })
  expect(headers[0].get('HTTP-Referer')).toBe('https://slop.gallery')
  expect(headers[0].get('X-OpenRouter-Title')).toBe('Slop Gallery')
  expect(path.basename(first.output)).toBe('voice.opus')
  expect(path.basename(second.output)).toBe('voice_2.opus')
  const outputBytes = await Bun.file(first.output).bytes()
  expect(outputBytes.subarray(0, 4)).toEqual(Uint8Array.from([79, 103, 103, 83]))
  expect(first.sampleRate).toBe(24_000)
  expect(first.duration).toBe(0.1)
  expect(first.timings).toEqual([
    {
      char: 'H',
      start: 0,
      end: 0.05,
    },
    {
      char: 'i',
      start: 0.05,
      end: 0.1,
    },
  ])
  expect(first.trim).toMatchObject({
    changed: false,
    thresholdDb: -50,
  })
  expect(await fs.pathExists(first.metadataPath)).toBe(true)
  expect(await fs.pathExists(first.rawPath)).toBe(true)
  expect(first.rawPath.replaceAll('\\', '/')).toStartWith(path.resolve(root, 'private/prerender-voice/store'))
  expect(first.metadataPath.replaceAll('\\', '/')).toStartWith(path.resolve(root, 'private/prerender-voice/cache'))
})
test('validates input and output before synthesis', async () => {
  const root = await temporaryRoot()
  let calls = 0
  const fetch = async () => {
    calls++
    return response()
  }
  expect(prerenderVoice({
    fetch,
    input: ' ',
    rootFolder: root,
  })).rejects.toThrow('nonempty')
  expect(prerenderVoice({
    fetch,
    input: 'Hi',
    output: 'voice.mp3',
    rootFolder: root,
  })).rejects.toThrow('.opus')
  expect(calls).toBe(0)
})
