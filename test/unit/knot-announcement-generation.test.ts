import {expect, spyOn, test} from 'bun:test'

import * as path from 'forward-slash-path'
import fs from 'fs-extra'
import GrokSpeaker from 'grok-speaker'

import announceKnots from '../../scripts/announceKnots.ts'
import pcmWave from '../../src/lib/audio/pcmWave.ts'

test('voice replacements are staged until every selected announcement succeeds and failed requests need explicit retry', async () => {
  const parent = path.resolve(import.meta.dir, '../../private/agent')
  await fs.ensureDir(parent)
  const root = await fs.mkdtemp(path.resolve(parent, 'iris-test-'))
  const outputRoot = path.resolve(root, 'output')
  const cacheRoot = path.resolve(root, 'cache')
  const ids = ['astra/slug/gpt-6-astra', 'astra/items/malachite']
  const paths = ids.map(id => path.resolve(outputRoot, id, 'announce.opus'))
  for (const output of paths) {
    await fs.outputFile(output, 'previous voice')
  }
  const pcm = Int16Array.from({length: 4800}, (_, i) => Math.sin(i * 0.1) * 1000)
  const audio = {
    wav: new Uint8Array(await pcmWave(pcm.buffer, 48_000).arrayBuffer()),
    sampleRate: 48_000,
    duration: 0.1,
    timestamps: [
      {
        char: 'A',
        start: 0,
        end: 0.1,
      },
    ],
  }
  const telemetry = spyOn(globalThis, 'fetch').mockImplementation(Object.assign(async () => Response.json({}), {preconnect: globalThis.fetch.preconnect}))
  const generate = spyOn(GrokSpeaker.prototype, 'generate').mockImplementation(async (text, options) => {
    expect(text).toMatchObject({modifier: 'loud'})
    expect(options).toEqual({timestamps: true})
    if (typeof text === 'object' && 'text' in text && text.text === 'Emerald Heart') {
      throw new Error('Provider unavailable.')
    }
    return audio
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
    expect(generate).toHaveBeenCalledTimes(2)
    for (const output of paths) {
      expect(await Bun.file(output).text()).toBe('previous voice')
    }
    await expect(announceKnots(options)).rejects.toThrow('no announcements were published')
    expect(generate).toHaveBeenCalledTimes(2)
    generate.mockResolvedValue(audio)
    expect(await announceKnots({
      ...options,
      retryFailed: true,
    })).toEqual(paths)
    expect(generate).toHaveBeenCalledTimes(3)
    for (const output of paths) {
      const bytes = await Bun.file(output).bytes()
      expect(bytes.slice(0, 4)).toEqual((new TextEncoder).encode('OggS'))
    }
    await announceKnots({
      ...options,
      key: '',
    })
    expect(generate).toHaveBeenCalledTimes(3)
    expect(await Array.fromAsync(new Bun.Glob('**/request-*.json').scan(cacheRoot))).toHaveLength(1)
    const receipts = await Array.fromAsync(new Bun.Glob('*/receipt.json').scan(cacheRoot))
    const receipt = await fs.readJson(path.resolve(cacheRoot, receipts[0])) as {bitrate: number
      output: string
      telemetryDelivered: boolean}
    expect(receipt.bitrate).toBe(20_000)
    expect(receipt.telemetryDelivered).toBe(true)
    const previous = await Promise.all(paths.map(file => Bun.file(file).bytes()))
    await Bun.write(receipt.output, 'corrupted cached audio')
    await expect(announceKnots(options)).rejects.toThrow('no announcements were published')
    expect(generate).toHaveBeenCalledTimes(3)
    for (const [i, file] of paths.entries()) {
      expect(await Bun.file(file).bytes()).toEqual(previous[i])
    }
  } finally {
    generate.mockRestore()
    telemetry.mockRestore()
    for await (const receiptFile of new Bun.Glob('**/receipt.json').scan(cacheRoot)) {
      const receipt = await fs.readJson(path.resolve(cacheRoot, receiptFile)) as {cache: string}
      await fs.remove(receipt.cache)
    }
    await fs.remove(root)
  }
})
