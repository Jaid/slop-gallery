import {afterEach, expect, spyOn, test} from 'bun:test'

import FlavorGenerator from '../../src/lib/ai/FlavorGenerator.ts'
import MergeGenerator from '../../src/lib/ai/MergeGenerator.ts'

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
  const result = await new FlavorGenerator('test-key', 'test-model').generate(new Blob(['pixels'], {type: 'image/webp'}), partial => partials.push(partial))
  expect(result).toEqual(flavor)
  expect(partials.length).toBeGreaterThan(0)
  expect(fetchSpy.mock.calls[0]![0]).toBe('https://openrouter.ai/api/v1/chat/completions')
  const request = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string)
  expect(request.model).toBe('test-model')
  expect(request.messages.at(-1).content[0].image_url.url).toStartWith('data:image/webp;base64,')
})
test('the real image adapter keeps hanging/thrown attachment order', async () => {
  const data = new Uint8Array(await Bun.file('public/art/work-0.webp').arrayBuffer())
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    created: 1,
    data: [{b64_json: data.toBase64()}],
  }))
  const first = Bun.file('public/art/work-0.webp')
  const second = Bun.file('public/art/work-1.webp')
  const result = await new MergeGenerator('test-key', 'test-image-model').generate(first, second)
  expect(result.size).toBe(data.byteLength)
  expect(fetchSpy.mock.calls[0]![0]).toBe('https://openrouter.ai/api/v1/images')
  const request = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string)
  expect(request.input_references.map((r: {image_url: {url: string}}) => r.image_url.url.split(',')[1])).toEqual([
    new Uint8Array(await first.arrayBuffer()).toBase64(),
    new Uint8Array(await second.arrayBuffer()).toBase64(),
  ])
})
