import {expect, test} from 'bun:test'

import {knotBays, knotNumberLabel} from 'knot-materials/exhibition.ts'
import {knotPreviewGrid, knotPreviewMaximumHeight, knotPreviewMaximumWidth, knotPreviewTextureCellSize, knotPreviewTextureLayout} from 'knot-materials/KnotPreviewLayout.ts'

import drawPreview, {knotPreviewBackground} from '../../src/components/levels/knottingham/KnotPreviewSigns/drawPreview.ts'

test('runtime billboard layout chooses compact formats and matches its raster aspect', () => {
  const formats = new Map<number, [number, number]>([
    [1, [1, 1]],
    [2, [2, 1]],
    [3, [2, 2]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 2]],
    [7, [3, 3]],
    [8, [3, 3]],
    [9, [3, 3]],
    [10, [4, 3]],
    [16, [4, 4]],
    [17, [4, 5]],
    [22, [4, 6]],
  ])
  for (const [count, [columns, rows]] of formats) {
    const grid = knotPreviewGrid(count)
    const raster = knotPreviewTextureLayout(count)
    expect(grid.width).toBeLessThanOrEqual(knotPreviewMaximumWidth)
    expect(grid.height).toBeLessThanOrEqual(knotPreviewMaximumHeight)
    expect([grid.columns, grid.rows]).toEqual([columns, rows])
    expect(grid.width / grid.height).toBeCloseTo(raster.width / raster.height)
    expect(raster.width).toBe(columns * knotPreviewTextureCellSize)
    expect(raster.height).toBe(rows * knotPreviewTextureCellSize)
  }
  expect(knotPreviewGrid(4).width).toBe(knotPreviewGrid(4).height)
  expect(knotPreviewTextureLayout(4).width).toBe(knotPreviewTextureLayout(4).height)
})
test('incomplete final rows are centered within their billboard format', () => {
  const source = knotBays.find(bay => bay.finishes.length >= 3)!
  const bay = {
    ...source,
    finishes: source.finishes.slice(0, 3),
  }
  const layout = knotPreviewTextureLayout(3)
  const texts: Array<Array<unknown>> = []
  const context = {
    canvas: {
      width: layout.width,
      height: layout.height,
    },
    fillRect() {},
    drawImage() {},
    measureText: () => ({width: 180}),
    fillText: (...args: Array<unknown>) => texts.push(args),
  } as unknown as CanvasRenderingContext2D
  drawPreview(context, bay, new Map)
  expect(texts).toHaveLength(3)
  expect(texts[2][1]).toBe(layout.width / 2)
})
test('runtime billboard textures keep the default preview population below 192 MiB', () => {
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
    expect(texts[index].style).toBe(finish.placeholder.color)
  }
})
