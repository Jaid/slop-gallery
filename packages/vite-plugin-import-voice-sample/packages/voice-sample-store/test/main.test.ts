import type {VoiceSampleFetch, VoiceSampleMetadata} from '../src/types.ts'

import {afterEach, describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'
import {unpack} from 'msgpackr'

import VoiceSampleStore, {defaultVoiceSampleBitrate, defaultVoiceSampleCooldown, styleVoiceSampleText} from '../src/main.ts'

const directories: Array<string> = []
const temporaryDirectory = async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'voice-sample-store-'))
  directories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => fs.remove(directory)))
})
const pcm = (sampleRate = 24_000) => Buffer.alloc(Math.round(sampleRate * 0.1) * 2, 1)
const response = (sampleRate = 24_000) => Response.json({
  audio: pcm(sampleRate).toBase64(),
  duration: 0.1,
  content_type: 'audio/pcm',
  audio_timestamps: {
    graph_chars: ['H', 'i'],
    graph_times: [[0, 0.04], [0.04, 0.1]],
  },
}, {headers: {'x-generation-id': 'trace-id'}})
const trimPcm = () => {
  const sampleRate = 24_000
  const parts = [[30, 80], [100, 5000], [50, 80]] as const
  const result = Buffer.alloc(parts.reduce((sum, part) => sum + Math.round(sampleRate * part[0] / 1000), 0) * 2)
  let offset = 0
  for (const part of parts) {
    const samples = Math.round(sampleRate * part[0] / 1000)
    for (let index = 0; index < samples; index++) {
      result.writeInt16LE(part[1], offset)
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
describe('VoiceSampleStore', () => {
  test('prepares formats from one canonical synthesis with root-relative folders', async () => {
    const root = await temporaryDirectory()
    const calls: Array<Record<string, unknown>> = []
    const headers: Array<Headers> = []
    const fetch: VoiceSampleFetch = async (_input, init) => {
      if (typeof init?.body !== 'string') {
        throw new TypeError('Expected JSON body.')
      }
      calls.push(JSON.parse(init.body) as Record<string, unknown>)
      headers.push(new Headers(init.headers))
      return response()
    }
    const store = new VoiceSampleStore({
      rootFolder: root,
      apiKey: 'test-key',
      app: 'https://voice.example.test/path',
      fetch,
      trim: false,
    })
    const base = {
      emotion: 'loud',
      text: 'Hello',
      language: 'en',
      voice: 'iris',
      trim: false,
    } as const
    const wav = await store.prepare({
      ...base,
      format: 'wav',
    })
    const timings = await store.prepare({
      ...base,
      format: 'timings',
    })
    const pcmEntry = await store.prepare({
      ...base,
      format: 'pcm',
    })
    const opus = await store.prepare({
      ...base,
      format: 'opus',
    })
    expect(calls).toHaveLength(1)
    expect(headers[0].get('HTTP-Referer')).toBe('https://voice.example.test/path')
    expect(headers[0].get('X-OpenRouter-Title')).toBe('voice.example.test')
    expect(calls[0]).toMatchObject({
      input: '<loud>Hello</loud>',
      voice: 'iris',
      provider: {
        options: {
          xai: {
            language: 'en',
            output_format: {
              codec: 'pcm',
              sample_rate: 24_000,
            },
          },
        },
      },
    })
    expect(wav.path).toBe(wav.rawPath)
    expect(timings.path).toBe(timings.metadataPath)
    expect(pcmEntry.path).toEndWith('.pcm')
    expect(opus.path).toEndWith('.opus')
    const opusBytes = await fs.readFile(opus.path)
    expect(opusBytes.subarray(0, 4).toString()).toBe('OggS')
    expect(await fs.readFile(pcmEntry.path)).toEqual(pcm())
    expect(wav.metadata).toMatchObject({
      input: '<loud>Hello</loud>',
      voice: 'iris',
    })
    expect(wav.metadata.timings).toEqual(timings.metadata.timings)
    const rawMetadata = unpack(await fs.readFile(wav.metadataPath)) as VoiceSampleMetadata
    expect(rawMetadata).toMatchObject({
      input: '<loud>Hello</loud>',
      voice: 'iris',
    })
    expect(defaultVoiceSampleBitrate(24_000)).toBe(16_384)
    const storeFiles = await fs.readdir(join(root, 'temp/voice-sample-store/store'))
    expect(storeFiles.filter(file => file.endsWith('.wav'))).toHaveLength(1)
  })
  test('trim settings create reusable derivatives with aligned timing metadata', async () => {
    const root = await temporaryDirectory()
    let calls = 0
    const store = new VoiceSampleStore({
      rootFolder: root,
      apiKey: 'test-key',
      fetch: async () => {
        calls++
        return trimResponse()
      },
    })
    const base = {
      text: 'Trim me',
      language: 'en',
      voice: 'iris',
    } as const
    const trimmed = await store.prepare({
      ...base,
      format: 'wav',
    })
    const timings = await store.prepare({
      ...base,
      format: 'timings',
    })
    const raw = await store.prepare({
      ...base,
      format: 'wav',
      trim: false,
    })
    const strict = await store.prepare({
      ...base,
      format: 'wav',
      trimThreshold: -60,
    })
    expect(calls).toBe(1)
    expect(trimmed.rawPath).toBe(raw.rawPath)
    expect(trimmed.path).not.toBe(trimmed.rawPath)
    expect(raw.path).toBe(raw.rawPath)
    expect(timings.metadataPath).toBe(trimmed.metadataPath)
    expect(trimmed.metadata).toMatchObject({
      duration: 0.12,
      input: 'Trim me',
      sampleRate: 24_000,
      trim: {
        changed: true,
        removedEndSeconds: 0.04,
        removedStartSeconds: 0.02,
        sourceDuration: 0.18,
        thresholdDb: -50,
      },
      voice: 'iris',
    })
    expect(trimmed.metadata.timings[0]).toEqual({
      char: '<',
      start: 0,
      end: 0,
    })
    expect(trimmed.metadata.timings[1].start).toBeCloseTo(0.01)
    expect(trimmed.metadata.timings[3]).toEqual({
      char: '>',
      start: 0.12,
      end: 0.12,
    })
    expect(strict.metadata).toMatchObject({
      duration: 0.18,
      trim: {
        changed: false,
        thresholdDb: -60,
      },
    })
    expect(strict.metadataPath).not.toBe(trimmed.metadataPath)
    const decoded = unpack(await fs.readFile(trimmed.metadataPath)) as VoiceSampleMetadata
    expect(decoded).toMatchObject({
      input: 'Trim me',
      voice: 'iris',
    })
    expect(decoded.timings).toEqual(trimmed.metadata.timings)
  })
  test('stretches concurrent provider request starts by the configured cooldown', async () => {
    const root = await temporaryDirectory()
    const starts: Array<number> = []
    const cooldown = 30
    const store = new VoiceSampleStore({
      rootFolder: root,
      apiKey: 'test-key',
      cooldown,
      fetch: async () => {
        starts.push(performance.now())
        return response()
      },
      trim: false,
    })
    await Promise.all([
      store.prepare({
        text: 'First',
        format: 'wav',
      }),
      store.prepare({
        text: 'Second',
        format: 'wav',
      }),
      store.prepare({
        text: 'Third',
        format: 'wav',
      }),
    ])
    expect(defaultVoiceSampleCooldown).toBe(1000)
    expect(starts).toHaveLength(3)
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(cooldown - 2)
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(cooldown - 2)
  })
  test('validates preparation options before synthesis', async () => {
    const root = await temporaryDirectory()
    let calls = 0
    expect(() => new VoiceSampleStore({
      rootFolder: root,
      cooldown: 0,
    })).not.toThrow()
    expect(() => new VoiceSampleStore({
      rootFolder: root,
      cooldown: -1,
    })).toThrow('cooldown')
    expect(() => new VoiceSampleStore({
      rootFolder: root,
      cooldown: 1.5,
    })).toThrow('cooldown')
    const store = new VoiceSampleStore({
      rootFolder: root,
      fetch: async () => {
        calls++
        return response()
      },
    })
    expect(store.prepare({text: ''})).rejects.toThrow('nonempty')
    expect(store.prepare({
      text: 'Hello',
      trimThreshold: 1,
    })).rejects.toThrow('dBFS')
    expect(store.prepare({
      text: 'Hello',
      emotion: 'mysteriously-purple',
    })).rejects.toThrow('Unsupported voice sample emotion')
    expect(calls).toBe(0)
    expect(() => styleVoiceSampleText('Hello', 'cheerful')).not.toThrow()
  })
})
