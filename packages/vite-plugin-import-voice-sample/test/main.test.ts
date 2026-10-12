import type {InlineConfig, Rollup} from 'vite'
import type {VoiceSampleFetch} from 'voice-sample-store'

import {afterEach, describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import {build, createLogger} from 'vite'

import importVoiceSample, {defaultVoiceSampleBitrate, styleVoiceSampleText} from '../src/main.ts'

const directories: Array<string> = []
const temporaryDirectory = async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'voice-sample-'))
  directories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => fs.remove(directory)))
})
const pcm = (sampleRate = 24_000) => Buffer.alloc(Math.round(sampleRate * 0.1) * 2, 1)
const envelope = (sampleRate = 24_000) => ({
  audio: pcm(sampleRate).toBase64(),
  duration: 0.1,
  content_type: 'audio/pcm',
  audio_timestamps: {
    graph_chars: ['H', 'i'],
    graph_times: [[0, 0.04], [0.04, 0.1]],
  },
})
const response = (sampleRate = 24_000) => Response.json(envelope(sampleRate), {
  headers: {'x-generation-id': 'trace-id'},
})
const trimPcm = () => {
  const sampleRate = 24_000
  const parts = [[30, 80], [100, 5000], [50, 80]] as const
  const result = Buffer.alloc(parts.reduce((sum, [milliseconds]) => sum + Math.round(sampleRate * milliseconds / 1000), 0) * 2)
  let offset = 0
  for (const [milliseconds, value] of parts) {
    const samples = Math.round(sampleRate * milliseconds / 1000)
    for (let index = 0; index < samples; index++) {
      result.writeInt16LE(value, offset)
      offset += 2
    }
  }
  return result
}
const trimResponse = () => Response.json({
  audio: trimPcm().toBase64(),
  duration: 0.18,
  content_type: 'audio/pcm',
  audio_timestamps: {
    graph_chars: ['<', 'H', 'i', '>'],
    graph_times: [[0, 0.015], [0.03, 0.09], [0.09, 0.14], [0.16, 0.18]],
  },
}, {headers: {'x-generation-id': 'trim-trace'}})
const fetchRecorder = (calls: Array<Record<string, unknown>>, sampleRate = 24_000, headerCalls?: Array<Headers>): VoiceSampleFetch => async (_input, init) => {
  if (typeof init?.body !== 'string') {
    throw new TypeError('Expected a JSON request body.')
  }
  const body = JSON.parse(init.body) as unknown
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('Expected an object request body.')
  }
  calls.push(body as Record<string, unknown>)
  headerCalls?.push(new Headers(init.headers))
  return response(sampleRate)
}
const buildConfig = (root: string): InlineConfig => ({
  root,
  configFile: false,
  logLevel: 'silent',
  build: {
    assetsInlineLimit: 0,
    lib: {
      entry: join(root, 'entry.ts'),
      formats: ['es'],
    },
    write: false,
  },
})
const outputCode = (result: Awaited<ReturnType<typeof build>>) => {
  const buildResults = Array.isArray(result) ? result : [result]
  return buildResults.flatMap(item => {
    return 'output' in item ? item.output : []
  }).filter((output): output is Rollup.OutputChunk => output.type === 'chunk').map(output => output.code).join('\n')
}
describe('vite-plugin-import-voice-sample', () => {
  test('uses Iris by default and path speaker explicitly overrides it', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import iris from 'voice:grok' with {text: 'Grok', format: 'wav'}
      import ara from 'voice:grok-ara/ara' with {text: 'Grok', format: 'wav'}
      export {iris, ara}
    `)
    const calls: Array<Record<string, unknown>> = []
    const headerCalls: Array<Headers> = []
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls, 24_000, headerCalls),
      })],
    })
    expect(calls).toHaveLength(2)
    expect(headerCalls.every(headers => headers.get('HTTP-Referer') === 'https://slop.gallery')).toBe(true)
    expect(headerCalls.every(headers => headers.get('X-OpenRouter-Title') === 'Slop Gallery')).toBe(true)
    expect(calls.map(call => call.voice).toSorted((a, b) => String(a).localeCompare(String(b)))).toEqual(['ara', 'iris'])
    const storeFiles = await fs.readdir(join(root, 'temp/vite-plugin-import-voice-sample/store'))
    expect(storeFiles.filter(file => file.endsWith('.wav'))).toHaveLength(2)
    expect(storeFiles.filter(file => file.endsWith('.msgpack'))).toHaveLength(2)
  })
  test('folder controls default cache/store subfolders and string app uses URL hostname title', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:folders' with {text: 'Folders', format: 'opus'}
      export default audio
    `)
    let headers: Headers | undefined
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        app: 'https://voice.example.test/path',
        fetch: async (_input, init) => {
          headers = new Headers(init?.headers)
          return response()
        },
        folder: 'temp/custom-voice',
      })],
    })
    expect(headers?.get('HTTP-Referer')).toBe('https://voice.example.test/path')
    expect(headers?.get('X-OpenRouter-Title')).toBe('voice.example.test')
    expect(await fs.readdir(join(root, 'temp/custom-voice/store'))).toHaveLength(2)
    const customCacheFiles = await fs.readdir(join(root, 'temp/custom-voice/cache'))
    expect(customCacheFiles.some(file => file.endsWith('.opus'))).toBe(true)
  })
  test('cacheFolder and storageFolder override folder and App object headers stay exact', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:overrides' with {text: 'Overrides', format: 'opus'}
      export default audio
    `)
    let headers: Headers | undefined
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        app: {
          title: 'Voice Lab',
          url: 'https://voice.example.test/app',
        },
        cacheFolder: 'temp/derivatives',
        fetch: async (_input, init) => {
          headers = new Headers(init?.headers)
          return response()
        },
        folder: 'temp/unused-base',
        storageFolder: 'temp/raw-voice',
      })],
    })
    expect(headers?.get('HTTP-Referer')).toBe('https://voice.example.test/app')
    expect(headers?.get('X-OpenRouter-Title')).toBe('Voice Lab')
    expect(await fs.readdir(join(root, 'temp/raw-voice'))).toHaveLength(2)
    const derivativeFiles = await fs.readdir(join(root, 'temp/derivatives'))
    expect(derivativeFiles.some(file => file.endsWith('.opus'))).toBe(true)
    expect(await fs.pathExists(join(root, 'temp/unused-base/store'))).toBe(false)
    expect(await fs.pathExists(join(root, 'temp/unused-base/cache'))).toBe(false)
  })
  test('contents and reference select runtime values without changing the synthesis', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audioReference from 'voice:kinds' with {text: 'Kinds', format: 'wav', type: 'reference'}
      import audioContents from 'voice:kinds' with {text: 'Kinds', format: 'wav', type: 'contents'}
      import timingContents from 'voice:kinds' with {text: 'Kinds', format: 'timings', type: 'contents'}
      export {audioReference, audioContents, timingContents}
    `)
    const calls: Array<Record<string, unknown>> = []
    const result = await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls),
        trim: false,
      })],
    })
    expect(calls).toHaveLength(1)
    const code = outputCode(result)
    expect(code).toContain('new Uint8Array')
    expect(code).toContain('atob(')
    expect(code).not.toContain('node:buffer')
    expect(code).toMatch(/char:\s*"H"/u)
    const directory = join(root, 'temp/vite-plugin-import-voice-sample')
    expect(await fs.pathExists(join(directory, 'cache'))).toBe(false)
  })
  test('timing reference returns the MessagePack asset rather than materializing timings', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import timingReference from 'voice:timing-reference' with {text: 'Timing reference', format: 'timings', type: 'reference'}
      export default timingReference
    `)
    const calls: Array<Record<string, unknown>> = []
    const result = await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls),
        trim: false,
      })],
    })
    expect(calls).toHaveLength(1)
    const code = outputCode(result)
    expect(code).not.toMatch(/char:\s*"H"/u)
    expect(code).toMatch(/(?:data:|msgpack)/u)
    expect(await fs.pathExists(join(root, 'temp/vite-plugin-import-voice-sample/cache'))).toBe(false)
  })
  test('audio contents use Buffer in a Node-like Vite server environment', async () => {
    const root = await temporaryDirectory()
    const entry = join(root, 'entry.ts')
    await fs.writeFile(entry, `
      import audio from 'voice:server' with {text: 'Server', format: 'wav', type: 'contents'}
      export default audio
    `)
    const calls: Array<Record<string, unknown>> = []
    const result = await build({
      root,
      configFile: false,
      logLevel: 'silent',
      build: {
        ssr: entry,
        write: false,
      },
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls),
      })],
    })
    expect(calls).toHaveLength(1)
    const code = outputCode(result)
    expect(code).toContain('node:buffer')
    expect(code).toContain('Buffer.from(')
    expect(code).not.toContain('atob(')
  })
  test('format timings defaults to contents and shares the raw store', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:welcome' with {
        text: 'Hello, I am Iris!',
        emotion: 'cheerful',
        language: 'en',
        format: 'wav',
      }
      import timings from 'voice:welcome' with {
        text: 'Hello, I am Iris!',
        emotion: 'cheerful',
        language: 'en',
        format: 'timings',
      }
      export {audio, timings}
    `)
    const calls: Array<Record<string, unknown>> = []
    const result = await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls),
        trim: false,
      })],
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      model: 'x-ai/grok-voice-tts-1.0',
      input: '<sing-song>Hello, I am Iris!</sing-song>',
      voice: 'iris',
      response_format: 'pcm',
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
    expect(await fs.pathExists(join(directory, 'cache'))).toBe(false)
    const code = outputCode(result)
    expect(code).toMatch(/char:\s*"H"/u)
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        fetch: async () => {
          throw new Error('cache miss')
        },
        trim: false,
      })],
    })
  })
  test('defaults to 24 kHz and supports a sample-rate override', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:rate' with {text: 'Rate', format: 'wav'}
      export default audio
    `)
    const calls: Array<Record<string, unknown>> = []
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls, 48_000),
        sampleRate: 48_000,
      })],
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      provider: {
        options: {
          xai: {
            output_format: {
              codec: 'pcm',
              sample_rate: 48_000,
            },
          },
        },
      },
    })
    expect(defaultVoiceSampleBitrate(24_000)).toBe(Math.round(0.68266 * 24_000))
    expect(defaultVoiceSampleBitrate(24_000)).toBe(16_384)
    expect(defaultVoiceSampleBitrate(48_000)).toBe(32_768)
  })
  test('plugin trim defaults can be overridden by import attributes without resynthesizing', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import raw from 'voice:trim-default' with {text: 'Trim me', format: 'wav'}
      import inheritedThreshold from 'voice:trim-inherited' with {text: 'Trim me', format: 'wav', trim: 'true'}
      import overriddenThreshold from 'voice:trim-overridden' with {text: 'Trim me', format: 'timings', trim: 'true', trimThreshold: '-50'}
      export {raw, inheritedThreshold, overriddenThreshold}
    `)
    const calls: Array<Record<string, unknown>> = []
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: async (_input, init) => {
          if (typeof init?.body !== 'string') {
            throw new TypeError('Expected a JSON request body.')
          }
          calls.push(JSON.parse(init.body) as Record<string, unknown>)
          return trimResponse()
        },
        trim: false,
        trimThreshold: -60,
      })],
    })
    expect(calls).toHaveLength(1)
    const folder = join(root, 'temp/vite-plugin-import-voice-sample')
    expect(await fs.readdir(join(folder, 'store'))).toHaveLength(2)
    const cacheFiles = await fs.readdir(join(folder, 'cache'))
    expect(cacheFiles.filter(file => file.endsWith('.wav'))).toHaveLength(2)
    expect(cacheFiles.filter(file => file.endsWith('.msgpack'))).toHaveLength(2)
  })
  test('optional replaces unfetchable samples with one second of shared silence', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import wav from 'voice:silent-wav' with {text: 'Silent', format: 'wav', type: 'contents'}
      import pcm from 'voice:silent-pcm' with {text: 'Also silent', format: 'pcm', type: 'contents'}
      import opus from 'voice:silent-opus' with {text: 'Silent', format: 'opus'}
      import timings from 'voice:silent-timings' with {text: 'Silent', format: 'timings'}
      import timingReference from 'voice:silent-timing-reference' with {text: 'Silent', format: 'timings', type: 'reference'}
      export {wav, pcm, opus, timings, timingReference}
    `)
    const warnings: Array<string> = []
    const result = await build({
      ...buildConfig(root),
      logLevel: 'warn',
      customLogger: {
        ...createLogger('silent'),
        warn: message => {
          warnings.push(message)
        },
      },
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        cooldown: 0,
        fetch: async () => new Response('no credits', {status: 402}),
        optional: true,
      })],
    })
    expect(warnings.filter(message => message.includes('1 s of silence') && message.includes('HTTP 402'))).toHaveLength(1)
    expect(warnings.some(message => message.includes('5 voice samples were replaced by silence.'))).toBe(true)
    const code = outputCode(result)
    const folder = join(root, 'temp/vite-plugin-import-voice-sample')
    expect(await fs.readdir(join(folder, 'store'))).toHaveLength(0)
    const cacheFiles = await fs.readdir(join(folder, 'cache'))
    const silenceWav = cacheFiles.find(file => file.endsWith('.wav'))
    expect(silenceWav).toBeDefined()
    const wav = await fs.readFile(join(folder, 'cache', silenceWav!))
    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(24_000)
    expect(wav.byteLength).toBe(44 + 24_000 * 2)
    expect(wav.subarray(44).every(byte => byte === 0)).toBe(true)
    expect(cacheFiles.filter(file => file.endsWith('.wav'))).toHaveLength(1)
    expect(cacheFiles.filter(file => file.endsWith('.pcm'))).toHaveLength(1)
    expect(cacheFiles.filter(file => file.endsWith('.opus'))).toHaveLength(1)
    expect(cacheFiles.filter(file => file.endsWith('.msgpack'))).toHaveLength(1)
    expect(code).toMatch(/=\s*\[\]/u)
  })
  test('optional fallback applies without an API key and leaves real generation for later', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:later' with {text: 'Later', format: 'wav'}
      export default audio
    `)
    const previousKey = process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
    try {
      await build({
        ...buildConfig(root),
        plugins: [importVoiceSample({
          fetch: async () => {
            throw new Error('must not fetch without a key')
          },
          optional: true,
        })],
      })
    } finally {
      if (previousKey !== undefined) {
        process.env.OPENROUTER_API_KEY = previousKey
      }
    }
    const calls: Array<Record<string, unknown>> = []
    await build({
      ...buildConfig(root),
      plugins: [importVoiceSample({
        apiKey: 'test-key',
        fetch: fetchRecorder(calls),
        optional: true,
      })],
    })
    expect(calls).toHaveLength(1)
  })
  test('unfetchable samples fail the build unless optional', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:required' with {text: 'Required', format: 'wav'}
      export default audio
    `)
    let error: unknown
    try {
      await build({
        ...buildConfig(root),
        plugins: [importVoiceSample({
          apiKey: 'test-key',
          fetch: async () => new Response('no credits', {status: 402}),
        })],
      })
    } catch (error_) {
      error = error_
    }
    expect(String(error)).toContain('HTTP 402')
  })
  test('optional does not hide invalid import attributes', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:invalid' with {text: 'Invalid', format: 'wav', emotion: 'mysteriously-purple'}
      export default audio
    `)
    let error: unknown
    try {
      await build({
        ...buildConfig(root),
        plugins: [importVoiceSample({
          apiKey: 'test-key',
          fetch: async () => new Response('no credits', {status: 402}),
          optional: true,
        })],
      })
    } catch (error_) {
      error = error_
    }
    expect(String(error)).toContain('Unsupported voice sample emotion')
  })
  test('rejects removed or invalid import attributes', async () => {
    const root = await temporaryDirectory()
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:grok' with {text: 'Grok', voice: 'ara'}
      export default audio
    `)
    let error: unknown
    try {
      await build({
        ...buildConfig(root),
        plugins: [importVoiceSample()],
      })
    } catch (error_) {
      error = error_
    }
    expect(String(error)).toContain('Unknown voice import attribute "voice"')
    await fs.writeFile(join(root, 'entry.ts'), `
      import audio from 'voice:grok' with {text: 'Grok', type: 'stream'}
      export default audio
    `)
    error = undefined
    try {
      await build({
        ...buildConfig(root),
        plugins: [importVoiceSample()],
      })
    } catch (error_) {
      error = error_
    }
    expect(String(error)).toContain('Unsupported voice import type "stream"')
    expect(() => styleVoiceSampleText('Hello', 'mysteriously-purple')).toThrow('Unsupported voice sample emotion')
  })
})
