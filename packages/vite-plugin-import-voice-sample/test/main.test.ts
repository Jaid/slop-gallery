import type {VoiceSampleFetch} from '../src/types.ts'
import type {InlineConfig} from 'vite'

import {afterEach, describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import {unpack} from 'msgpackr'
import {build} from 'vite'

import {styleVoiceSampleText} from '../src/emotion.ts'
import importVoiceSample from '../src/main.ts'
import VoiceSampleCache from '../src/VoiceSampleCache.ts'

const directories: Array<string> = []
const temporaryDirectory = async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'voice-sample-'))
  directories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => fs.remove(directory)))
})
const pcm = () => Buffer.alloc(4800 * 2)
const envelope = () => ({
  audio: pcm().toBase64(),
  duration: 0.1,
  content_type: 'audio/pcm',
  audio_timestamps: {
    graph_chars: ['H', 'i'],
    graph_times: [[0, 0.04], [0.04, 0.1]],
  },
})
const response = () => Response.json(envelope(), {
  headers: {'x-generation-id': 'trace-id'},
})
describe('vite-plugin-import-voice-sample', () => {
  test('always stores raw WAV and msgpack while timings avoid derivative caches', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice-sample:welcome' with {
        voice: 'iris',
        text: 'Hello, I am Iris!',
        emotion: 'cheerful',
        language: 'en',
        format: 'wav',
      }
      import timings from 'voice-sample:welcome/timings' with {
        voice: 'iris',
        text: 'Hello, I am Iris!',
        emotion: 'cheerful',
        language: 'en',
        format: 'opus',
      }
      export {audio, timings}
    `)
    const calls: Array<{
      body: Record<string, unknown>
      headers: Headers
    }> = []
    const fetchMock: VoiceSampleFetch = async (_input, init) => {
      if (typeof init?.body !== 'string') {
        throw new TypeError('Expected a JSON request body.')
      }
      const body = JSON.parse(init.body) as unknown
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new TypeError('Expected an object request body.')
      }
      calls.push({
        body: body as Record<string, unknown>,
        headers: new Headers(init.headers),
      })
      return response()
    }
    const config: InlineConfig = {
      root,
      configFile: false as const,
      logLevel: 'silent' as const,
      build: {
        assetsInlineLimit: 0,
        lib: {
          entry: join(root, 'entry.ts'),
          formats: ['es'],
        },
        write: false,
      },
    }
    const result = await build({
      ...config,
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchMock,
      })],
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('HTTP-Referer')).toBe('https://slop.gallery')
    expect(calls[0].headers.get('X-OpenRouter-Title')).toBe('Slop Gallery')
    expect(calls[0].body).toMatchObject({
      model: 'x-ai/grok-voice-tts-1.0',
      input: '<sing-song>Hello, I am Iris!</sing-song>',
      voice: 'iris',
      response_format: 'pcm',
      provider: {
        options: {
          xai: {
            language: 'en',
            with_timestamps: true,
          },
        },
      },
    })
    const directory = join(root, 'temp/vite-plugin-import-voice-sample')
    const store = join(directory, 'store')
    const storeFiles = await fs.readdir(store)
    expect(storeFiles).toHaveLength(2)
    const wavName = storeFiles.find(file => file.endsWith('.wav'))
    const metadataName = storeFiles.find(file => file.endsWith('.msgpack'))
    expect(wavName).toBeDefined()
    expect(metadataName).toBeDefined()
    const rawWav = await fs.readFile(join(store, wavName!))
    expect(rawWav.subarray(0, 4).toString()).toBe('RIFF')
    expect(unpack(await fs.readFile(join(store, metadataName!)))).toEqual({
      duration: 0.1,
      sampleRate: 48_000,
      timings: [
        {
          char: 'H',
          start: 0,
          end: 0.04,
        },
        {
          char: 'i',
          start: 0.04,
          end: 0.1,
        },
      ],
      traceId: 'trace-id',
    })
    expect(await fs.pathExists(join(directory, 'cache'))).toBe(false)
    const buildResults = Array.isArray(result) ? result : [result]
    const outputs = buildResults.flatMap(item => {
      return 'output' in item ? item.output : []
    })
    const code = outputs.filter(output => output.type === 'chunk').map(output => output.code).join('\n')
    expect(code).toMatch(/char:\s*"H"/u)
    expect(code).toMatch(/start:\s*0/u)
    await build({
      ...config,
      plugins: [importVoiceSample({
        fetch: async () => {
          throw new Error('cache miss')
        },
      })],
    })
  })
  test('shares raw storage across formats and caches only requested Opus and PCM conversions', async () => {
    const root = await temporaryDirectory()
    let calls = 0
    const cache = new VoiceSampleCache({
      apiKey: 'test-key',
      directory: root,
      fetch: async () => {
        calls++
        return response()
      },
    })
    const base = {
      language: 'en',
      text: 'Shared sample',
      voice: 'iris',
    } as const
    const opusRequest = {
      ...base,
      format: 'opus' as const,
    }
    const pcmRequest = {
      ...base,
      format: 'pcm' as const,
    }
    const wavRequest = {
      ...base,
      format: 'wav' as const,
    }
    expect(cache.key(opusRequest)).toBe(cache.key(pcmRequest))
    expect(cache.key(opusRequest)).toBe(cache.key(wavRequest))
    const opusEntry = await cache.getAudio(opusRequest)
    const pcmEntry = await cache.getAudio(pcmRequest)
    const wavEntry = await cache.getAudio(wavRequest)
    expect(calls).toBe(1)
    expect(opusEntry.rawPath).toBe(pcmEntry.rawPath)
    expect(opusEntry.rawPath).toBe(wavEntry.rawPath)
    expect(wavEntry.audioPath).toBe(wavEntry.rawPath)
    expect(opusEntry.audioPath).toEndWith('.opus')
    expect(pcmEntry.audioPath).toEndWith('.pcm')
    const opus = await fs.readFile(opusEntry.audioPath)
    expect(opus.subarray(0, 4).toString()).toBe('OggS')
    expect(await fs.readFile(pcmEntry.audioPath)).toEqual(pcm())
    const storeFiles = await fs.readdir(join(root, 'store'))
    expect(storeFiles.toSorted()).toEqual([
      `${cache.key(opusRequest)}.msgpack`,
      `${cache.key(opusRequest)}.wav`,
    ])
    const cacheFiles = await fs.readdir(join(root, 'cache'))
    expect(cacheFiles.toSorted()).toEqual([
      `${cache.key(opusRequest)}.opus`,
      `${cache.key(opusRequest)}.pcm`,
    ])
    expect(storeFiles.some(file => file.endsWith('.pcm'))).toBe(false)
  })
  test('rejects unsupported emotions instead of silently ignoring them', () => {
    expect(() => styleVoiceSampleText('Hello', 'mysteriously-purple')).toThrow('Unsupported voice sample emotion')
  })
})
