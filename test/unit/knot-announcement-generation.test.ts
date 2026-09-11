import {expect, spyOn, test} from 'bun:test'
import {resolve} from 'node:path'

import fs from 'fs-extra'

import announceKnots from '../../scripts/announceKnots.ts'
import NarrationGenerator from '../../src/lib/ai/NarrationGenerator.ts'

test('voice replacements are staged until every selected announcement succeeds and failed requests need explicit retry', async () => {
  const parent = resolve(import.meta.dir, '../../private/agent')
  await fs.ensureDir(parent)
  const root = await fs.mkdtemp(resolve(parent, 'iris-test-'))
  const outputRoot = resolve(root, 'output')
  const cacheRoot = resolve(root, 'cache')
  const ids = ['astra/slug/gpt-6-astra', 'astra/items/malachite']
  const paths = ids.map(id => resolve(outputRoot, id, 'announce.opus'))
  for (const path of paths) {
    await fs.outputFile(path, 'previous voice')
  }
  const pcm = Int16Array.from({length: 2400}, (_, i) => Math.sin(i * 0.1) * 1000)
  const fetch = spyOn(NarrationGenerator.prototype, 'request').mockImplementation(async (_, options) => {
    const request = JSON.parse(options!.body as string) as Record<string, unknown>
    expect(request.model).toBe('x-ai/grok-voice-tts-1.0')
    expect(request.voice).toBe('iris')
    expect(request.response_format).toBe('pcm')
    expect(request.provider).toEqual({options: {xai: {language: 'en'}}})
    return request.input === 'Emerald Heart.' ? new Response(null, {status: 502}) : new Response(pcm, {headers: {'content-type': 'audio/pcm;rate=24000;channels=1'}})
  })
  const options = {
    ids,
    outputRoot,
    cacheRoot,
    force: true,
    key: 'test-key',
  }
  try {
    await expect(announceKnots(options)).rejects.toThrow('no announcements were published')
    expect(fetch).toHaveBeenCalledTimes(2)
    for (const path of paths) {
      expect(await Bun.file(path).text()).toBe('previous voice')
    }
    await expect(announceKnots(options)).rejects.toThrow('no announcements were published')
    expect(fetch).toHaveBeenCalledTimes(2)
    fetch.mockResolvedValue(new Response(pcm, {headers: {'content-type': 'audio/pcm;rate=24000;channels=1'}}))
    expect(await announceKnots({
      ...options,
      retryFailed: true,
    })).toEqual(paths)
    expect(fetch).toHaveBeenCalledTimes(3)
    for (const path of paths) {
      const bytes = await Bun.file(path).bytes()
      expect(bytes.slice(0, 4)).toEqual((new TextEncoder).encode('OggS'))
    }
    await announceKnots({
      ...options,
      key: '',
    })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(await Array.fromAsync(new Bun.Glob('**/request-*.json').scan(cacheRoot))).toHaveLength(1)
  } finally {
    fetch.mockRestore()
    await fs.remove(root)
  }
})
