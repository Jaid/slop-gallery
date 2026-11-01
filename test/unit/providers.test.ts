import {afterEach, expect, spyOn, test} from 'bun:test'

import FlavorGenerator from '../../src/lib/ai/FlavorGenerator.ts'
import MergeGenerator from '../../src/lib/ai/MergeGenerator.ts'
import * as modelImageModule from '../../src/lib/ai/modelImage.ts'

const bitmap = globalThis.createImageBitmap
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>> | undefined
afterEach(() => {
  fetchSpy?.mockRestore()
  globalThis.createImageBitmap = bitmap
})
test('the real text adapter consumes streamed structured output', async () => {
  globalThis.createImageBitmap = async () => ({
    width: 64,
    height: 64,
    close() {},
  })
  const flavor = {
    title: 'A remarkable misunderstanding',
    creator: 'The test curator',
    description: 'Art survives the test.',
    year: 2026,
  }
  const chunk = (content: string, finish: string | null = null) => `data: ${JSON.stringify({
    id: 'test',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'test-model',
    choices: [
      {
        index: 0,
        delta: {content},
        finish_reason: finish,
      },
    ],
  })}\n\n`
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`${chunk(JSON.stringify(flavor)) + chunk('', 'stop')}data: [DONE]\n\n`, {headers: {'content-type': 'text/event-stream'}}))
  const partials: Array<unknown> = []
  const flavorGenerator = new FlavorGenerator('test-key', 'test-model')
  const result = await flavorGenerator.generate(new Blob(['pixels'], {type: 'image/webp'}), partial => partials.push(partial))
  expect(result).toEqual(flavor)
  expect(partials.length).toBeGreaterThan(0)
  expect(fetchSpy.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions')
  const request = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {
    messages: Array<{content: Array<{image_url: {url: string}}>}>
    model: string
  }
  expect(request.model).toBe('test-model')
  expect(request.messages.at(-1)!.content[0].image_url.url).toStartWith('data:image/webp;base64,')
})
test('the real image adapter keeps hanging/thrown attachment order', async () => {
  const data = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    created: 1,
    data: [{b64_json: data.toBase64()}],
  }))
  const first = new Blob([data], {type: 'image/png'})
  const second = new Blob([Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEUAAP+KeNJXAAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')], {type: 'image/png'})
  const mergeGenerator = new MergeGenerator('test-key', 'test-image-model')
  const result = await mergeGenerator.generate(first, second)
  expect(result.size).toBe(data.byteLength)
  expect(fetchSpy.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/images')
  const request = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {input_references: Array<{image_url: {url: string}}>}
  const firstImageBytes = new Uint8Array(await first.arrayBuffer())
  const secondImageBytes = new Uint8Array(await second.arrayBuffer())
  expect(request.input_references.map((r: {image_url: {url: string}}) => r.image_url.url.split(',')[1])).toEqual([
    firstImageBytes.toBase64(),
    secondImageBytes.toBase64(),
  ])
})
test('the real image adapter sends an orb’s prompt with the work as the only image', async () => {
  const data = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    created: 1,
    data: [{b64_json: data.toBase64()}],
  }))
  const work = new Blob([data], {type: 'image/png'})
  const mergeGenerator = new MergeGenerator('test-key', 'test-image-model')
  const result = await mergeGenerator.generateFromOrb(work, 'Make it spooky.')
  expect(result.size).toBe(data.byteLength)
  const request = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {
    input_references: Array<{image_url: {url: string}}>
    prompt: string
  }
  expect(request.input_references.map(r => r.image_url.url.split(',')[1])).toEqual([data.toBase64()])
  expect(request.prompt).toBe('Make it spooky.')
})
test('the real image adapter asks a known model for the supported ratio closest to the hung work and an unknown one for none', async () => {
  const data = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
  fetchSpy = spyOn(globalThis, 'fetch')
  const work = new Blob([data], {type: 'image/png'})
  const request = async (model: string, aspect?: number) => {
    fetchSpy!.mockResolvedValueOnce(Response.json({
      created: 1,
      data: [{b64_json: data.toBase64()}],
    }))
    const mergeGenerator = new MergeGenerator('test-key', model)
    await mergeGenerator.generate(work, work, {aspect})
    return JSON.parse(fetchSpy!.mock.calls.at(-1)![1]!.body as string) as {
      aspect_ratio?: string
      model: string
    }
  }
  expect(await request('google/gemini-nano-banana-2.1', 1.5)).toMatchObject({
    model: 'google/gemini-nano-banana-2.1',
    aspect_ratio: '3:2',
  })
  expect(await request('openai/gpt-image-2.5-sunburst', 0.5)).toHaveProperty('aspect_ratio', '9:16')
  expect(await request('x-ai/grok-imagine-image-2.0', 0.5)).toHaveProperty('aspect_ratio', '1:2')
  expect(await request('test-image-model', 1.5)).not.toHaveProperty('aspect_ratio')
  expect(await request('google/gemini-nano-banana-2.1')).not.toHaveProperty('aspect_ratio')
})
test('the real image adapter re-encodes an image of a format image models reject, like a JXL work, to WebP', async () => {
  const data = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEX/AAAZ4gk3AAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    created: 1,
    data: [{b64_json: data.toBase64()}],
  }))
  // A bare JXL codestream signature, whatever its media type claims.
  const work = new Blob([new Uint8Array([0xFF, 0x0A, 0xFA, 0x1F, 0x19, 0x00])], {type: 'image/png'})
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4C])
  const encoded: Array<Blob> = []
  const toWebp = spyOn(modelImageModule, 'toWebp').mockImplementation(image => {
    encoded.push(image)
    return Promise.resolve(new Blob([webp], {type: 'image/webp'}))
  })
  const mergeGenerator = new MergeGenerator('test-key', 'test-image-model')
  try {
    await mergeGenerator.generateFromOrb(work, 'Make it spooky.')
  } finally {
    toWebp.mockRestore()
  }
  expect(encoded).toEqual([work])
  const request = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {input_references: Array<{image_url: {url: string}}>}
  expect(request.input_references.map(r => r.image_url.url)).toEqual([`data:image/webp;base64,${webp.toBase64()}`])
})
test('only PNG, JPEG and WebP signatures count as formats image models take', () => {
  expect(modelImageModule.modelImageType(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).toBe('image/png')
  expect(modelImageModule.modelImageType(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('image/jpeg')
  expect(modelImageModule.modelImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp')
  expect(modelImageModule.modelImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBeUndefined()
  expect(modelImageModule.modelImageType(new Uint8Array([0xFF, 0x0A, 0xFA, 0x1F]))).toBeUndefined()
  expect(modelImageModule.modelImageType(new Uint8Array([0, 0, 0, 0x0C, 0x4A, 0x58, 0x4C, 0x20]))).toBeUndefined()
})
