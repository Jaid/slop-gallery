import {expect, spyOn, test} from 'bun:test'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import {decodeIrisQuality, irisQualityRequest} from '../../scripts/lib/knots/irisQuality.ts'
import IrisQualityAudition from '../../scripts/lib/knots/IrisQualityAudition.ts'
import {auditionTranscript} from '../../scripts/lib/knots/voiceAuditions.ts'

function envelope(rate = 48_000) {
  return {
    audio: Buffer.from(new Int16Array(rate).buffer).toString('base64'),
    content_type: 'audio/pcm',
    duration: 1,
    audio_timestamps: {
      graph_chars: ['a', 'b'],
      graph_times: [[0, 0.5], [0.5, 1]],
    },
  }
}
const encode = (value: unknown) => (new TextEncoder).encode(JSON.stringify(value))
test('Iris review requests use loud tags, native English, timestamps, maximum PCM rate and quality-first latency', () => {
  const direct = irisQualityRequest('xai', 'GPT-6 Astra.', {normalization: true})
  expect(direct).toEqual({
    text: '<loud>GPT-6 Astra.</loud>',
    voice_id: 'iris',
    language: 'en',
    output_format: {
      codec: 'pcm',
      sample_rate: 48_000,
    },
    optimize_streaming_latency: 0,
    with_timestamps: true,
    text_normalization: true,
  })
  const router = irisQualityRequest('openrouter', 'GPT-6 Astra.', {normalization: true})
  expect(router).toHaveProperty('input', '<loud>GPT-6 Astra.</loud>')
  expect(router).toHaveProperty('provider.options.xai.output_format.sample_rate', 48_000)
  expect(router).toHaveProperty('provider.options.xai.with_timestamps', true)
  expect(router).toHaveProperty('response_format', 'pcm')
})
test('plain and loud requests differ only in the wrapping tag', () => {
  for (const transport of ['xai', 'openrouter'] as const) {
    for (const text of auditionTranscript) {
      const loud = irisQualityRequest(transport, text)
      const plain = irisQualityRequest(transport, text, {loud: false})
      const key = transport === 'xai' ? 'text' : 'input'
      expect(plain).toHaveProperty(key, text)
      expect(loud).toEqual({
        ...plain,
        [key]: `<loud>${text}</loud>`,
      })
    }
  }
})
test('timed PCM is decoded from its actual envelope and its real sample rate, not the requested rate', () => {
  expect(decodeIrisQuality(encode(envelope())).sampleRate).toBe(48_000)
  const router = decodeIrisQuality(encode(envelope(24_000)))
  expect(router.sampleRate).toBe(24_000)
  expect(router.uniformlySpaced).toBe(true)
  expect(router.timestamps[1]).toEqual({
    char: 'b',
    start: 0.5,
    end: 1,
  })
  const value = {
    ...envelope(),
    audio_timestamps: {
      graph_chars: ['a', 'b'],
      graph_times: [
        {
          start: 0,
          end: 0.2,
        }, {
          start: 0.3,
          end: 1,
        },
      ],
    },
  }
  expect(decodeIrisQuality(encode(value)).uniformlySpaced).toBe(false)
})
test('invalid PCM, unsupported rates and missing or invalid timestamps cannot masquerade as valid review audio', () => {
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    audio: 'AA==',
  }))).toThrow('Invalid 16-bit PCM')
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    content_type: 'audio/mpeg',
  }))).toThrow('Expected a timed PCM')
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    duration: 0,
  }))).toThrow()
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    audio_timestamps: null,
  }))).toThrow('timestamps')
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    duration: 0.6,
  }))).toThrow('sample rate')
  expect(() => decodeIrisQuality(encode({
    ...envelope(),
    audio_timestamps: {
      graph_chars: ['x'],
      graph_times: [[0, 10]],
    },
  }))).toThrow('Invalid timestamp')
})
test('both transports retain five independent responses and never send the direct key to OpenRouter', async () => {
  const parent = resolve(import.meta.dir, '../../private/agent')
  await fs.ensureDir(parent)
  const output = await fs.mkdtemp(resolve(parent, 'iris-quality-test-'))
  const requests: Array<{body: unknown
    url: string}> = []
  const mockFetch = Object.assign(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    const direct = url.startsWith('https://api.x.ai/')
    const headers = new Headers(options?.headers)
    expect(headers.get('Authorization')).toBe(direct ? 'Bearer direct-key' : 'Bearer router-key')
    if (!direct) {
      expect(headers.get('X-OpenRouter-Cache')).toBe('false')
    }
    requests.push({
      url,
      body: JSON.parse(options?.body as string) as unknown,
    })
    return new Response(encode(envelope(direct ? 48_000 : 24_000)), {
      headers: {
        'content-type': direct ? 'application/json' : 'audio/pcm;rate=24000;channels=1',
        'x-generation-id': String(requests.length),
      },
    })
  }, {preconnect: () => {}})
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(mockFetch)
  try {
    for (const transport of ['xai', 'openrouter'] as const) {
      const runner = new IrisQualityAudition(output, transport, transport === 'xai' ? 'direct-key' : 'router-key')
      const manifest = await runner.run()
      expect(manifest.clips.map(clip => clip.text)).toEqual(auditionTranscript)
      expect(manifest.clips.map(clip => clip.offset)).toEqual([0, 1.5, 3, 4.5, 6])
      expect(manifest.duration).toBe(7)
      expect(manifest.sampleRate).toBe(transport === 'xai' ? 48_000 : 24_000)
      await new IrisQualityAudition(output, transport, '').run()
    }
    expect(requests).toHaveLength(10)
    expect(new Set(requests.map(request => JSON.stringify(request.body))).size).toBe(10)
    const plain = await new IrisQualityAudition(output, 'xai', 'direct-key').run({loud: false})
    expect(plain.id).toBe('xai-quality')
    expect(plain.loud).toBe(false)
    expect(requests).toHaveLength(15)
    expect(plain.clips.map(clip => clip.request)).toEqual(auditionTranscript.map(text => irisQualityRequest('xai', text, {loud: false})))
    await new IrisQualityAudition(output, 'xai', '').run({loud: false})
    expect(requests).toHaveLength(15)
    const files = await Array.fromAsync(new Bun.Glob('**/response.bin').scan(output))
    await Bun.write(resolve(output, files.find(path => path.startsWith('xai-loud-'))!), 'damaged')
    await expect(new IrisQualityAudition(output, 'xai', '').run()).rejects.toThrow('Cached response changed')
  } finally {
    fetch.mockRestore()
    await fs.remove(output)
  }
})
