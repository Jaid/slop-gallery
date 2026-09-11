import {afterEach, expect, spyOn, test} from 'bun:test'

import ExternalGenerator from '../../src/lib/ai/ExternalGenerator.ts'
import NarrationGenerator from '../../src/lib/ai/NarrationGenerator.ts'
import pcmWave from '../../src/lib/audio/pcmWave.ts'

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>> | undefined
afterEach(() => fetchSpy?.mockRestore())
test('Grok Iris uses English provider options and preserves the declared PCM sample rate', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Int16Array(100), {headers: {'content-type': 'audio/pcm;rate=48000;channels=1'}}))
  const blob = await new NarrationGenerator('test-key', 'x-ai/grok-voice-tts-1.0', 'iris').generate('GPT-6 Astra.', {
    format: 'pcm',
    providerOptions: {xai: {language: 'en'}},
  })
  expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toEqual({
    model: 'x-ai/grok-voice-tts-1.0',
    voice: 'iris',
    input: 'GPT-6 Astra.',
    response_format: 'pcm',
    provider: {options: {xai: {language: 'en'}}},
  })
  expect(new DataView(await blob.arrayBuffer()).getUint32(24, true)).toBe(48_000)
})
test('stereo PCM cannot silently become a mono file at the wrong speed', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Int16Array(100), {headers: {'content-type': 'audio/pcm;rate=24000;channels=2'}}))
  await expect(new NarrationGenerator('test-key', 'x-ai/grok-voice-tts-1.0', 'iris').generate('Hello.', {format: 'pcm'})).rejects.toThrow('Expected mono PCM')
})
test('Gemini speech uses PCM and the central Slop Gallery app attribution', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([0, 0, 1, 0]), {headers: {'content-type': 'audio/pcm'}}))
  const blob = await new NarrationGenerator('test-key', 'google/gemini-3.1-flash-tts-preview', 'Algenib').generate('GLM 5.3')
  const [url, options] = fetchSpy.mock.calls[0]
  expect(url).toBe('https://openrouter.ai/api/v1/audio/speech')
  const headers = new Headers(options!.headers)
  expect(headers.get('Authorization')).toBe('Bearer test-key')
  expect(headers.get('HTTP-Referer')).toBe('https://slop.gallery')
  expect(headers.get('X-OpenRouter-Title')).toBe('Slop Gallery')
  expect(headers.get('X-OpenRouter-Categories')).toBe('game,image-gen')
  expect(JSON.parse(options!.body as string)).toEqual({
    model: 'google/gemini-3.1-flash-tts-preview',
    voice: 'Algenib',
    input: 'GLM 5.3',
    response_format: 'pcm',
  })
  expect(blob.type).toBe('audio/wav')
  const bytes = await blob.arrayBuffer()
  expect((new TextDecoder).decode(bytes.slice(0, 4))).toBe('RIFF')
  expect(new DataView(bytes).getUint32(24, true)).toBe(24_000)
  expect(new Uint8Array(bytes).slice(44)).toEqual(new Uint8Array([0, 0, 1, 0]))
})
test('all raw endpoints enforce attribution and cannot leak a key to another host', async () => {
  class Generator extends ExternalGenerator {}
  const generator = new Generator('test-key')
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
  await generator.request('../beta/batches', {
    method: 'POST',
    headers: {'X-OpenRouter-Title': 'Wrong'},
    body: '{}',
  })
  expect(fetchSpy.mock.calls[0][0]).toBe('https://openrouter.ai/api/beta/batches')
  expect(new Headers(fetchSpy.mock.calls[0][1]!.headers).get('X-OpenRouter-Title')).toBe('Slop Gallery')
  expect(() => generator.request('https://example.com/api/steal')).toThrow()
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})
test('rejects malformed audio and wraps only complete 16-bit PCM samples', async () => {
  expect(() => pcmWave(new ArrayBuffer(1))).toThrow()
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', {headers: {'content-type': 'application/json'}}))
  await expect(new NarrationGenerator('test', 'google/gemini-3.1-flash-tts-preview', 'Algenib').generate('Hello')).rejects.toThrow('unsupported audio')
})
