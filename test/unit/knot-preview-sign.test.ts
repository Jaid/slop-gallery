import {expect, test} from 'bun:test'

import drawPreview, {knotPreviewBackground} from '../../src/components/levels/knottingham/KnotPreviewSigns/drawPreview.ts'
import {knotBays, knotNumberLabel} from '../../src/lib/knots/exhibition.ts'
import {knotPreviewGrid, knotPreviewMaximumHeight, knotPreviewMaximumWidth, knotPreviewTextureLayout, knotPreviewTextureRowHeight, knotPreviewTextureWidth} from '../../src/lib/knots/KnotPreviewLayout.ts'

test('runtime billboard layout preserves physical bounds and matches its raster aspect', () => {
  for (const count of [1, 4, 5, 17, 22]) {
    const grid = knotPreviewGrid(count)
    const raster = knotPreviewTextureLayout(count)
    expect(grid.width).toBeLessThanOrEqual(knotPreviewMaximumWidth)
    expect(grid.height).toBeLessThanOrEqual(knotPreviewMaximumHeight)
    expect(grid.rows).toBe(Math.max(2, Math.ceil(count / 4)))
    expect(grid.width / grid.height).toBeCloseTo(raster.width / raster.height)
    expect(raster.width).toBe(knotPreviewTextureWidth)
    expect(raster.height).toBe(raster.rows * knotPreviewTextureRowHeight)
  }
})
test('doubled runtime billboard resolution keeps the complete preview population below 192 MiB', () => {
  const bytes = knotBays.reduce((total, bay) => {
    const raster = knotPreviewTextureLayout(bay.finishes.length)
    return total + raster.width * raster.height * 4
  }, 0)
  expect(bytes).toBeLessThan(192 * 1024 ** 2)
  expect(knotBays.every(bay => bay.finishes.length > 0)).toBe(true)
})
test('candidate atlas draws dynamic numbers, titles, accents and image fallbacks in one surface', () => {
  const bay = knotBays[0]
  const layout = knotPreviewTextureLayout(bay.finishes.length)
  const fills: Array<{
    args: Array<number>
    style: string
  }> = []
  const texts: Array<{
    args: Array<unknown>
    style: string
  }> = []
  const images: Array<Array<unknown>> = []
  let fillStyle = ''
  const context = {
    canvas: {
      width: layout.width,
      height: layout.height,
    },
    font: '',
    textAlign: '',
    textBaseline: '',
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(value: string) {
      fillStyle = value
    },
    fillRect: (...args: Array<number>) => fills.push({
      args,
      style: fillStyle,
    }),
    drawImage: (...args: Array<unknown>) => images.push(args),
    measureText: () => ({width: 180}),
    fillText: (...args: Array<unknown>) => texts.push({
      args,
      style: fillStyle,
    }),
  } as unknown as CanvasRenderingContext2D
  const bitmap = {
    width: 200,
    height: 100,
  } as ImageBitmap
  const bitmaps = new Map([[bay.finishes[0].icon, bitmap]])
  drawPreview(context, bay, bitmaps)
  expect(fills[0]).toEqual({
    args: [0, 0, layout.width, layout.height],
    style: knotPreviewBackground,
  })
  expect(images).toHaveLength(1)
  expect(images[0][0]).toBe(bitmap)
  expect(fills.filter(fill => fill.style === '#5d2929')).toHaveLength(bay.finishes.length - 1)
  expect(texts).toHaveLength(bay.finishes.length)
  for (const [index, finish] of bay.finishes.entries()) {
    expect(texts[index].args[0]).toBe(`${knotNumberLabel(finish.number)} · ${finish.title}`)
    expect(texts[index].style).toBe(finish.accent)
  }
})
