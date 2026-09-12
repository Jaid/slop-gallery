import {describe, expect, test} from 'bun:test'

import drawLabel, {labelAtlasColumns, labelHeight, labelVerticalPadding, labelWidth, modelLineLayout} from '../../src/components/levels/knottingham/KnotLabels/drawLabel.ts'
import {knotBays, knotExhibition} from '../../src/lib/knots/exhibition.ts'
import {knotsByNumber} from '../../src/lib/knots/index.ts'
import {knotSign} from '../../src/lib/knots/signs.ts'

describe('Knot model plates', () => {
  test('pads each plate to landscape 3:2 without extra draw batches', () => {
    expect(labelWidth).toBe(384 * 2)
    expect(labelWidth / labelHeight).toBe(3 / 2)
    expect(labelVerticalPadding).toBe(96)
    expect(knotSign.width / knotSign.height).toBeCloseTo(labelWidth / labelHeight)
    expect(knotSign.elevation).toBe(0.8)
    expect(labelAtlasColumns * labelWidth).toBeLessThanOrEqual(8192)
    expect(Math.ceil(knotExhibition.length / labelAtlasColumns) * labelHeight).toBeLessThanOrEqual(8192)
  })
  test('ships a local icon for every exhibited model and reuses family marks', async () => {
    const urls = new Set<string>
    for (const bay of knotBays) {
      const url = bay.icon
      expect(url).toBeDefined()
      expect(new Uint8Array(await Bun.file(new URL(url)).arrayBuffer())[0]).toBe(255)
      urls.add(Bun.hash(await Bun.file(new URL(url)).arrayBuffer()).toString())
    }
    expect(urls.size).toBe(7)
    const icon = async (number: number) => Bun.hash(await Bun.file(new URL(knotsByNumber.get(number)!.modelIcon)).arrayBuffer())
    expect(await icon(6)).toBe(await icon(73))
    expect(await icon(73)).toBe(await icon(97))
    expect(await icon(72)).toBe(await icon(6))
    expect(await icon(15)).toBe(await icon(89))
    expect(await icon(32)).toBe(await icon(81))
  })
  test('centers the icon and text together and fits long names inside the plate', () => {
    for (const measured of [90, 240, 400, 1000]) {
      for (const hasIcon of [true, false]) {
        const line = modelLineLayout(measured, hasIcon)
        expect(line.left).toBeGreaterThanOrEqual(24)
        expect(line.left * 2 + line.iconSize + line.gap + line.textWidth).toBe(labelWidth)
        expect(line.textWidth).toBeLessThanOrEqual(measured)
        expect(line.iconSize).toBe(hasIcon ? 52 : 0)
        expect(line.gap).toBe(hasIcon ? 16 : 0)
      }
    }
  })
  test('draws three text lines and a proportional icon into the existing atlas tile', () => {
    const text: Array<Array<unknown>> = []
    const images: Array<Array<unknown>> = []
    const rectangles: Array<Array<number>> = []
    const fonts: Array<string> = []
    const context = {
      set font(value: string) {
        fonts.push(value)
      },
      fillRect: (...args: Array<number>) => rectangles.push(args),
      fillText: (...args: Array<unknown>) => text.push(args),
      drawImage: (...args: Array<unknown>) => images.push(args),
      measureText: () => ({width: 240}),
    } as unknown as CanvasRenderingContext2D
    const icon = {
      naturalWidth: 256,
      naturalHeight: 128,
    } as HTMLImageElement
    const exhibit = knotExhibition[0]
    drawLabel(context, exhibit, labelWidth, labelHeight, icon)
    expect(fonts).toEqual(['600 84px main', '600 46px main', '44px main'])
    expect(rectangles[0]).toEqual([labelWidth, labelHeight, labelWidth, labelHeight])
    expect(text.map(line => line[0])).toEqual([exhibit.label, exhibit.title, exhibit.modelTitle])
    const {left} = modelLineLayout(240, true)
    expect(images).toEqual([[icon, labelWidth + left, labelHeight + labelVerticalPadding + 264 - 13, 52, 26]])
    expect(text[2]).toEqual([exhibit.modelTitle, labelWidth + left + 68, labelHeight + labelVerticalPadding + 264, 240])
    images.length = 0
    drawLabel(context, exhibit, 0, 0)
    expect(images).toEqual([])
    expect(text.at(-1)).toEqual([exhibit.modelTitle, 264, labelVerticalPadding + 264, 240])
  })
})
