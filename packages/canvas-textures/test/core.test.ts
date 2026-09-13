import {afterEach, beforeEach, expect, mock, test} from 'bun:test'

import ReadbackCanvas, {loadCanvasFonts} from '../src/main.ts'
import {canvasFixture} from './canvasFixture.ts'

let fixture: ReturnType<typeof canvasFixture>
beforeEach(() => {
  fixture = canvasFixture()
})
afterEach(() => fixture.restore())
test('the first and only context request is readback-optimized, sRGB, and still supports alpha', () => {
  const surface = new ReadbackCanvas(4, 2)
  const recorded = fixture.surfaces[0]
  expect(recorded.canvas.getContext).toHaveBeenCalledTimes(1)
  expect(recorded.canvas.getContext).toHaveBeenCalledWith('2d', {
    willReadFrequently: true,
    colorSpace: 'srgb',
  })
  expect(recorded.context.getImageData).not.toHaveBeenCalled()
  expect(surface.canvas.width).toBe(4)
  expect(surface.canvas.height).toBe(2)
  surface.dispose()
})
test('readback retains the exact buffer range without a second pixel copy', () => {
  const surface = new ReadbackCanvas(4, 2)
  const image = surface.read()
  const original = fixture.surfaces[0].pixels()
  expect(image.data).toBeInstanceOf(Uint8Array)
  expect(image.data.buffer).toBe(original.buffer)
  expect(image.data.byteOffset).toBe(8)
  expect(image.data.byteLength).toBe(32)
  image.data[0] = 42
  expect(original[0]).toBe(42)
  surface.dispose()
  expect(image.data[0]).toBe(42)
  expect(surface.canvas.width).toBe(0)
  expect(surface.canvas.height).toBe(0)
  expect(() => surface.read()).toThrow('disposed')
  surface.dispose()
})
test('invalid dimensions fail before canvas allocation', () => {
  for (const value of [0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    expect(() => new ReadbackCanvas(value, 2)).toThrow(RangeError)
    expect(() => new ReadbackCanvas(2, value)).toThrow(RangeError)
  }
  expect(fixture.createElement).not.toHaveBeenCalled()
})
test('font readiness is scoped to the requested faces, not global document.fonts.ready', async () => {
  await loadCanvasFonts([
    {
      font: '600 70px main',
      text: 'Title',
    }, {
      font: '32px main',
      text: 'Creator',
    },
  ])
  expect(fixture.fonts.load).toHaveBeenCalledTimes(2)
  expect(fixture.fonts.load).toHaveBeenCalledWith('600 70px main', 'Title')
})
test('a font failure is reported but still permits one final fallback-font rendering', async () => {
  const error = new Error('missing font')
  fixture.fonts.load.mockImplementationOnce(async () => {
    throw error
  })
  const report = mock(() => {})
  await loadCanvasFonts([{font: 'missing'}, {font: 'available'}], report)
  expect(report).toHaveBeenCalledTimes(1)
  expect(report).toHaveBeenCalledWith(error)
  expect(fixture.fonts.load).toHaveBeenCalledTimes(2)
})
