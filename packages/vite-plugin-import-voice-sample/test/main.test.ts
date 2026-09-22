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
describe('vite-plugin-import-voice-sample', () => {
  test('generates once, sends Slop Gallery attribution, and reuses the cache', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice-sample:welcome' with {
        voice: 'iris',
        text: 'Hello, I am Iris!',
        emotion: 'cheerful',
        language: 'en',
        format: 'wav',
      }
      export default audio
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
      return new Response(pcm(), {
        status: 200,
        headers: {'Content-Type': 'audio/pcm; rate=48000; channels=1'},
      })
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
    await build({
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
          },
        },
      },
    })
    const cacheFiles = await fs.readdir(join(root, 'temp/vite-plugin-import-voice-sample/cache'))
    expect(cacheFiles).toHaveLength(1)
    expect(cacheFiles[0]).toEndWith('.wav')
    const cachedWav = await fs.readFile(join(root, 'temp/vite-plugin-import-voice-sample/cache', cacheFiles[0]))
    expect(cachedWav.subarray(0, 4).toString()).toBe('RIFF')
    await build({
      ...config,
      plugins: [importVoiceSample({
        fetch: async () => {
          throw new Error('cache miss')
        },
      })],
    })
  })
  test('transcodes opus requests before caching', async () => {
    const root = await temporaryDirectory()
    const cache = new VoiceSampleCache({
      apiKey: 'test-key',
      cacheDir: root,
      fetch: async () => new Response(pcm(), {
        status: 200,
        headers: {'Content-Type': 'audio/pcm; rate=48000; channels=1'},
      }),
    })
    const output = await cache.get({
      format: 'opus',
      language: 'en',
      text: 'Opus sample',
      voice: 'iris',
    })
    expect(output).toEndWith('.opus')
    const bytes = await fs.readFile(output)
    expect(bytes.subarray(0, 4).toString()).toBe('OggS')
  })
  test('rejects unsupported emotions instead of silently ignoring them', () => {
    expect(() => styleVoiceSampleText('Hello', 'mysteriously-purple')).toThrow('Unsupported voice sample emotion')
  })
})
