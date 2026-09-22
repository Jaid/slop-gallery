import type {VoiceSampleFetch} from '../src/types.ts'
import type {InlineConfig} from 'vite'

import {afterEach, describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
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
describe('vite-plugin-import-voice-sample', () => {
  test('generates audio and timings once, sends attribution, and reuses the cache', async () => {
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
        format: 'wav',
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
      return Response.json(envelope())
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
    const cacheDirectory = join(root, 'temp/vite-plugin-import-voice-sample/cache')
    const cacheFiles = await fs.readdir(cacheDirectory)
    expect(cacheFiles).toHaveLength(2)
    const wavName = cacheFiles.find(file => file.endsWith('.wav'))
    const timingsName = cacheFiles.find(file => file.endsWith('.timings.json'))
    expect(wavName).toBeDefined()
    expect(timingsName).toBeDefined()
    const cachedWav = await fs.readFile(join(cacheDirectory, wavName!))
    expect(cachedWav.subarray(0, 4).toString()).toBe('RIFF')
    expect(await fs.readJson(join(cacheDirectory, timingsName!))).toEqual([
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
    ])
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
  test('transcodes opus requests before caching and retains timings', async () => {
    const root = await temporaryDirectory()
    const cache = new VoiceSampleCache({
      apiKey: 'test-key',
      cacheDir: root,
      fetch: async () => Response.json(envelope()),
    })
    const entry = await cache.get({
      format: 'opus',
      language: 'en',
      text: 'Opus sample',
      voice: 'iris',
    })
    expect(entry.audioPath).toEndWith('.opus')
    const bytes = await fs.readFile(entry.audioPath)
    expect(bytes.subarray(0, 4).toString()).toBe('OggS')
    expect(entry.timings).toEqual([
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
    ])
    expect(await fs.pathExists(entry.timingsPath)).toBe(true)
  })
  test('rejects unsupported emotions instead of silently ignoring them', () => {
    expect(() => styleVoiceSampleText('Hello', 'mysteriously-purple')).toThrow('Unsupported voice sample emotion')
  })
})
