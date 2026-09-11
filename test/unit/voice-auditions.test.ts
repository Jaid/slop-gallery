import {expect, spyOn, test} from 'bun:test'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import VoiceAuditionRunner from '../../scripts/lib/knots/VoiceAuditionRunner.ts'
import {auditionRequest, auditionTranscript, voiceAuditions} from '../../scripts/lib/knots/voiceAuditions.ts'

test('audition requests explicitly disable inherited response caching', async () => {
  const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, {status: 502}))
  try {
    await new VoiceAuditionRunner('unused', 'test-key').request('audio/speech')
    const headers = new Headers(fetch.mock.calls[0][1]?.headers)
    expect(headers.get('X-OpenRouter-Cache')).toBe('false')
    expect(headers.has('X-OpenRouter-Cache-TTL')).toBe(false)
  } finally {
    fetch.mockRestore()
  }
})
test('each character has five single-transcript requests with a fixed voice and style', () => {
  expect(voiceAuditions).toHaveLength(15)
  expect(new Set(voiceAuditions.map(voice => voice.id)).size).toBe(15)
  expect(auditionTranscript).toHaveLength(5)
  expect(auditionTranscript.at(-1)).toBe('GPT-6 Astra.')
  for (const voice of voiceAuditions) {
    const requests = auditionTranscript.map(text => auditionRequest(voice, text))
    expect(new Set(requests.map(request => request.input)).size).toBe(5)
    for (const [index, request] of requests.entries()) {
      expect(request.voice).toBe(voice.voice)
      if (voice.model.startsWith('google/')) {
        expect(request.input).toContain(voice.character)
        expect(request.input.split('\n\nSay exactly: ')[1]).toBe(auditionTranscript[index])
        expect(request).not.toHaveProperty('provider')
      } else if (voice.model === 'x-ai/grok-voice-tts-1.0') {
        expect(request.voice).toBe('iris')
        expect(request.input).toBe(auditionTranscript[index])
        expect(request).toHaveProperty('provider', {options: {xai: {language: 'en'}}})
      } else {
        expect(request.model).toBe('qwen/qwen-audio-3.0-tts-plus')
        expect(request.voice).toBe('longanlingxin')
        expect(request.input).toBe(auditionTranscript[index])
        expect(request).toHaveProperty('provider.options.alibaba.instruction', expect.stringContaining(voice.character))
        expect(request).toHaveProperty('provider.options.alibaba.sample_rate', 24_000)
      }
    }
  }
})
test('five independent requests are stitched in order, cached and never silently retried', async () => {
  const root = resolve(import.meta.dir, '../../private/agent')
  await fs.ensureDir(root)
  const output = await fs.mkdtemp(resolve(root, 'voice-audition-test-'))
  const runner = new VoiceAuditionRunner(output, 'test-key')
  let count = 0
  const request = spyOn(runner, 'request').mockImplementation(async () => {
    const pcm = Int16Array.from({length: 2400}, (_, i) => Math.sin(i * 0.1) * 1000)
    return new Response(pcm, {
      headers: {
        'Content-Type': 'audio/pcm',
        'X-Generation-Id': String(++count),
      },
    })
  })
  try {
    const manifest = await runner.run(voiceAuditions[0])
    expect(request).toHaveBeenCalledTimes(5)
    expect(manifest.clips.map(clip => clip.text)).toEqual(auditionTranscript)
    expect(manifest.clips.map(clip => clip.generationId)).toEqual(['1', '2', '3', '4', '5'])
    expect(manifest.duration).toBeCloseTo(2.5, 1)
    expect(manifest.clips.every(clip => clip.source.endsWith('source.wav'))).toBe(true)
    await runner.run(voiceAuditions[0])
    expect(request).toHaveBeenCalledTimes(5)
    request.mockImplementation(async () => new Response(null, {status: 502}))
    await expect(runner.run(voiceAuditions[1])).rejects.toThrow('502')
    expect(request).toHaveBeenCalledTimes(6)
    await expect(runner.run(voiceAuditions[1])).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(6)
    const retry = new VoiceAuditionRunner(output, 'test-key', true)
    const retryRequest = spyOn(retry, 'request').mockImplementation(async () => new Response(new Int16Array(2400), {
      headers: {'Content-Type': 'audio/pcm;rate=24000;channels=1'},
    }))
    try {
      await retry.run(voiceAuditions[1])
      expect(retryRequest).toHaveBeenCalledTimes(5)
      const attempts = await Array.fromAsync(new Bun.Glob('**/request-*.json').scan(output))
      expect(attempts).toHaveLength(1)
    } finally {
      retryRequest.mockRestore()
    }
    await Bun.write(manifest.clips[0].source, 'damaged')
    await expect(runner.run(voiceAuditions[0])).rejects.toThrow('Cached audio changed')
    expect(request).toHaveBeenCalledTimes(6)
  } finally {
    request.mockRestore()
    await fs.remove(output)
  }
})
