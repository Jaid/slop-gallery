import {expect, test} from 'bun:test'

import {knotBays, knotNumberLabel} from 'knot-materials/exhibition.ts'
import {knotPreviewHeight, knotPreviewTextureHeight, knotPreviewTextureLayout, knotPreviewTextureWidth, knotPreviewWidth} from 'knot-materials/KnotPreviewLayout.ts'

import drawPreview, {knotPreviewBackground} from '../../src/components/levels/knottingham/KnotPreviewSigns/drawPreview.ts'
import signAccentColor from '../../src/components/levels/knottingham/signAccentColor.ts'

test('runtime billboards keep one 3:2 mesh and pack stickers to fit the fixed raster', () => {
  expect(knotPreviewWidth / knotPreviewHeight).toBeCloseTo(3 / 2)
  expect(knotPreviewTextureWidth / knotPreviewTextureHeight).toBeCloseTo(3 / 2)
  const formats = new Map<number, [number, number]>([
    [1, [1, 1]],
    [2, [2, 1]],
    [3, [3, 1]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 2]],
    [7, [4, 2]],
    [8, [4, 2]],
    [9, [5, 2]],
    [10, [5, 2]],
    [11, [4, 3]],
    [16, [6, 3]],
    [22, [6, 4]],
    [36, [8, 5]],
  ])
  for (const [count, [columns, rows]] of formats) {
    const layout = knotPreviewTextureLayout(count)
    expect([layout.columns, layout.rows]).toEqual([columns, rows])
    expect(layout.width).toBe(knotPreviewTextureWidth)
    expect(layout.height).toBe(knotPreviewTextureHeight)
    expect(layout.rowCounts.reduce((sum, rowCount) => sum + rowCount, 0)).toBe(count)
    expect(Math.max(...layout.rowCounts)).toBe(columns)
  }
})
test('shorter rows are kept in the middle and centered within the billboard', () => {
  expect(knotPreviewTextureLayout(11).rowCounts).toEqual([4, 3, 4])
  expect(knotPreviewTextureLayout(13).rowCounts).toEqual([5, 3, 5])
  expect(knotPreviewTextureLayout(36).rowCounts).toEqual([8, 7, 6, 7, 8])
  const source = knotBays.find(bay => bay.finishes.length === 4)!
  const bay = {
    ...source,
    finishes: [...source.finishes, {
      ...source.finishes[0],
      number: source.finishes.at(-1)!.number + 1,
    }],
  }
  const layout = knotPreviewTextureLayout(bay.finishes.length)
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
  expect(layout.rowCounts).toEqual([2, 3])
  expect(texts).toHaveLength(5)
  expect((texts[0][1] as number) + (texts[1][1] as number)).toBe(layout.width)
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
  const bitmaps = new Map([[bay.finishes[0].id, bitmap]])
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
    expect(texts[index].style).toBe(signAccentColor(finish.placeholder.color))
  }
})
