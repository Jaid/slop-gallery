import {describe, expect, test} from 'bun:test'

import {accentLineSize, creatorStickerHeight, creatorStickerSize, creatorStickerWidth, drawCreatorSticker, drawTitleSticker, knotDetailLine, labelAtlasColumns, modelLineLayout, titleStickerHeight, titleStickerSize, titleStickerWidth} from '../../src/components/levels/knottingham/KnotLabels/drawLabel.ts'
import {knotBays, knotExhibition} from '../../src/lib/knots/exhibition.ts'
import {knotsById} from '../../src/lib/knots/index.ts'
import {knotSign} from '../../src/lib/knots/signs.ts'

const iconHash = async (id: string) => Bun.hash(await Bun.file(new URL(knotsById.get(id)!.modelIcon)).arrayBuffer())
describe('Knot model plates', () => {
  test('uses two compact sticker atlases and a non-rasterized accent line', () => {
    const stickerPixels = titleStickerWidth * titleStickerHeight + creatorStickerWidth * creatorStickerHeight
    expect(stickerPixels).toBe((640 * 192 + 512 * 96) / 4)
    expect(titleStickerSize).toEqual([0.8, 0.24])
    expect(creatorStickerSize).toEqual([0.75, 0.14])
    expect(labelAtlasColumns * titleStickerWidth).toBeLessThanOrEqual(8192)
    expect(labelAtlasColumns * creatorStickerWidth).toBeLessThanOrEqual(8192)
    const rows = Math.ceil(knotExhibition.length / labelAtlasColumns)
    expect(rows * titleStickerHeight).toBeLessThanOrEqual(8192)
    expect(rows * creatorStickerHeight).toBeLessThanOrEqual(8192)
    expect(titleStickerSize[0]).toBeLessThan(knotSign.width)
    expect(titleStickerSize[1]).toBeLessThan(knotSign.height)
    expect(creatorStickerSize[0]).toBeLessThan(knotSign.width)
    expect(creatorStickerSize[1]).toBeLessThan(knotSign.height)
    expect(accentLineSize[0]).toBeLessThan(knotSign.width)
    expect(accentLineSize[1]).toBeLessThan(0.02)
  })
  test('ships a local icon for every exhibited model and reuses family marks', async () => {
    const urls = new Set<string>
    for (const bay of knotBays) {
      const url = bay.icon
      expect(url).toBeDefined()
      expect(new Uint8Array(await Bun.file(new URL(url)).arrayBuffer())[0]).toBe(255)
      urls.add(Bun.hash(await Bun.file(new URL(url)).arrayBuffer()).toString())
    }
    expect(urls.size).toBe(10)
    expect(await iconHash('astra/lenticular_mirage')).toBe(await iconHash('astra/solar_reliquary'))
    expect(await iconHash('astra/solar_reliquary')).toBe(await iconHash('astra/coralline_crown'))
    expect(await iconHash('sol/celestial_rose')).toBe(await iconHash('astra/lenticular_mirage'))
    expect(await iconHash('sonnet/opal_fire')).toBe(await iconHash('fable/event_horizon'))
    expect(await iconHash('gemini/cyber_kintsugi')).toBe(await iconHash('gemini/event_horizon'))
  })
  test('centers the creator icon and text together and fits long names', () => {
    for (const measured of [90, 240, 400, 1000]) {
      for (const hasIcon of [true, false]) {
        const line = modelLineLayout(measured, hasIcon)
        expect(line.left).toBeGreaterThanOrEqual(8)
        expect(line.left * 2 + line.iconSize + line.gap + line.textWidth).toBe(creatorStickerWidth)
        expect(line.textWidth).toBeLessThanOrEqual(measured)
        expect(line.iconSize).toBe(hasIcon ? 20 : 0)
        expect(line.gap).toBe(hasIcon ? 6 : 0)
      }
    }
  })
  test('draws title and creator as independent stickers', () => {
    const titleText: Array<Array<unknown>> = []
    const titleRects: Array<Array<number>> = []
    const titleFonts: Array<string> = []
    const titleContext = {
      set font(value: string) {
        titleFonts.push(value)
      },
      fillRect: (...args: Array<number>) => titleRects.push(args),
      fillText: (...args: Array<unknown>) => titleText.push(args),
    } as unknown as CanvasRenderingContext2D
    const exhibit = {
      ...knotExhibition[0],
      harness: undefined,
      author: {model: {title: knotExhibition[0].modelTitle}},
    }
    drawTitleSticker(titleContext, exhibit, titleStickerWidth, titleStickerHeight)
    expect(titleFonts).toEqual(['600 35px main', '600 21px main'])
    expect(titleRects).toEqual([[titleStickerWidth, titleStickerHeight, titleStickerWidth, titleStickerHeight]])
    expect(titleText.map(line => line[0])).toEqual([exhibit.label, exhibit.title])
    const creatorText: Array<Array<unknown>> = []
    const images: Array<Array<unknown>> = []
    const creatorFonts: Array<string> = []
    const creatorContext = {
      set font(value: string) {
        creatorFonts.push(value)
      },
      fillRect() {},
      fillText: (...args: Array<unknown>) => creatorText.push(args),
      drawImage: (...args: Array<unknown>) => images.push(args),
      measureText: () => ({width: 240}),
    } as unknown as CanvasRenderingContext2D
    const icon = {
      naturalWidth: 256,
      naturalHeight: 128,
    } as HTMLImageElement
    drawCreatorSticker(creatorContext, exhibit, creatorStickerWidth, creatorStickerHeight, icon)
    expect(creatorFonts).toEqual(['16px main'])
    const {left} = modelLineLayout(240, true)
    expect(images).toEqual([[icon, creatorStickerWidth + left, creatorStickerHeight + 10.5, 20, 10]])
    expect(creatorText).toEqual([[exhibit.modelTitle, creatorStickerWidth + left + 26, creatorStickerHeight + 15.5, modelLineLayout(240, true).textWidth]])
  })
  test('formats harness and thinking effort with flattenString.list semantics', () => {
    const cases = [
      {
        harness: undefined,
        effortLevel: undefined,
        expected: '',
      },
      {
        harness: '',
        effortLevel: '',
        expected: '',
      },
      {
        harness: 'none',
        effortLevel: undefined,
        expected: 'non-agentic',
      },
      {
        harness: 'none',
        effortLevel: 'high',
        expected: 'non-agentic, high effort',
      },
      {
        harness: 'Codex',
        effortLevel: undefined,
        expected: 'Codex',
      },
      {
        harness: undefined,
        effortLevel: 'high',
        expected: 'high effort',
      },
      {
        harness: 'Codex',
        effortLevel: 'high',
        expected: 'Codex, high effort',
      },
    ] as const
    for (const {harness, effortLevel, expected} of cases) {
      expect(knotDetailLine(harness, effortLevel)).toBe(expected)
      const lines: Array<{align: string
        args: Array<unknown>
        font: string}> = []
      const context = {
        font: '',
        textAlign: '',
        fillRect() {},
        measureText: () => ({width: 240}),
        fillText(...args: Array<unknown>) {
          lines.push({
            args,
            font: this.font,
            align: this.textAlign,
          })
        },
      }
      const exhibit = {
        ...knotExhibition[0],
        harness,
        author: {
          model: {
            title: knotExhibition[0].modelTitle,
            effortLevel,
          },
        },
      }
      drawCreatorSticker(context as unknown as CanvasRenderingContext2D, exhibit, 0, 0)
      expect(lines).toHaveLength(expected ? 2 : 1)
      expect(lines[0].args[1]).toBeGreaterThanOrEqual(0)
      if (expected) {
        expect(lines[1]).toEqual({
          args: [expected, creatorStickerWidth / 2, 36, creatorStickerWidth - 12],
          font: '12px main',
          align: 'center',
        })
      }
    }
  })
})
