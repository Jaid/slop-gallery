import {afterEach, expect, mock, test} from 'bun:test'

import {closeCanvasBitmaps, loadCanvasBitmaps} from '../src/main.ts'

const originalFetch = globalThis.fetch
const originalCreateImageBitmap = globalThis.createImageBitmap
afterEach(() => {
  Object.assign(globalThis, {
    fetch: originalFetch,
    createImageBitmap: originalCreateImageBitmap,
  })
})
test('bitmap loading deduplicates URLs, reports individual failures and supports explicit lifetime cleanup', async () => {
  const close = mock(() => {})
  const fetch = mock(async (source: Request | URL | string) => {
    let url: string
    if (typeof source === 'string') {
      url = source
    } else if (source instanceof URL) {
      url = source.href
    } else {
      url = source.url
    }
    return url.includes('missing') ? new Response('', {status: 404}) : new Response(new Blob(['image']), {status: 200})
  })
  const createImageBitmap = mock(async () => ({
    width: 4,
    height: 2,
    close,
  }))
  Object.assign(globalThis, {
    fetch,
    createImageBitmap,
  })
  const report = mock((_source: string, _error: unknown) => {})
  const bitmaps = await loadCanvasBitmaps(['good.jxl', 'good.jxl', 'missing.jxl'], undefined, report)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(createImageBitmap).toHaveBeenCalledTimes(1)
  expect(bitmaps.size).toBe(1)
  expect(report).toHaveBeenCalledTimes(1)
  expect(report.mock.calls[0][0]).toBe('missing.jxl')
  closeCanvasBitmaps(bitmaps.values())
  expect(close).toHaveBeenCalledTimes(1)
})
test('already cancelled bitmap batches do no fetch or decode work', async () => {
  const fetch = mock(async () => new Response(new Blob(['image'])))
  const createImageBitmap = mock(async () => ({close() {}} as ImageBitmap))
  Object.assign(globalThis, {
    fetch,
    createImageBitmap,
  })
  const controller = new AbortController
  controller.abort()
  const bitmaps = await loadCanvasBitmaps(['good.jxl'], controller.signal)
  expect(bitmaps.size).toBe(0)
  expect(fetch).not.toHaveBeenCalled()
  expect(createImageBitmap).not.toHaveBeenCalled()
})
