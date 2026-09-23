import {describe, expect, test} from 'bun:test'

import {knotsById} from 'knot-materials'
import {knotBays, knotExhibition} from 'knot-materials/exhibition.ts'
import {knotSign} from 'knot-materials/signs.ts'

import drawLabel, {drawRarity, knotDetailLine, labelAtlasColumns, labelBackground, labelFonts, labelHeight, labelWidth, modelLineLayout, updateRarityAtlas} from '../../src/components/levels/knottingham/KnotLabels/drawLabel.ts'
import signAccentColor from '../../src/components/levels/knottingham/signAccentColor.ts'

const iconHash = async (id: string) => Bun.hash(await Bun.file(new URL(knotsById.get(id)!.candidate.icon)).arrayBuffer())
describe('Knot nameplates', () => {
  test('a complete face preserves text density and the atlas fits the current exhibition', () => {
    expect([labelWidth, labelHeight]).toEqual([720, 480])
    expect(labelWidth / labelHeight).toBeCloseTo(knotSign.width / knotSign.height)
    expect(labelWidth / knotSign.width).toBeGreaterThanOrEqual(800)
    expect(labelHeight / knotSign.height).toBeGreaterThanOrEqual(800)
    expect(labelAtlasColumns * labelWidth).toBeLessThanOrEqual(8192)
    expect(Math.ceil(knotExhibition.length / labelAtlasColumns) * labelHeight).toBeLessThanOrEqual(8192)
  })
  test('ships a local icon for every exhibited model and reuses family marks', async () => {
    const urls = new Set<string>
    for (const bay of knotBays) {
      const url = bay.candidate.icon
      expect(url).toBeDefined()
      expect(new Uint8Array(await Bun.file(new URL(url)).arrayBuffer())[0]).toBe(255)
      urls.add(Bun.hash(await Bun.file(new URL(url)).arrayBuffer()).toString())
    }
    expect(urls.size).toBeGreaterThan(0)
    expect(urls.size).toBeLessThan(knotBays.length)
    expect(await iconHash('lenticular_mirage')).toBe(await iconHash('solar_reliquary'))
    expect(await iconHash('solar_reliquary')).toBe(await iconHash('coralline_crown'))
    expect(await iconHash('celestial_rose')).toBe(await iconHash('lenticular_mirage'))
    expect(await iconHash('opal_fire')).toBe(await iconHash('event_horizon'))
    expect(await iconHash('cyber_kintsugi')).toBe(await iconHash('schwarzschild_vault'))
  })
  test('centers the candidate icon and model text together and fits long names', () => {
    for (const measured of [90, 240, 400, 1000]) {
      for (const hasIcon of [true, false]) {
        const line = modelLineLayout(measured, hasIcon)
        expect(line.left).toBeGreaterThanOrEqual(62)
        expect(line.left * 2 + line.iconSize + line.gap + line.textWidth).toBe(labelWidth)
        expect(line.textWidth).toBeLessThanOrEqual(measured)
        expect(line.iconSize).toBe(hasIcon ? 50 : 0)
        expect(line.gap).toBe(hasIcon ? 15 : 0)
      }
    }
  })
  test('draws the complete face once at any atlas offset, with centered icons and bounded text', () => {
    for (const [x, y] of [[0, 0], [labelWidth, labelHeight], [6 * labelWidth, 16 * labelHeight]]) {
      const texts: Array<Array<unknown>> = []
      const rects: Array<{
        args: Array<number>
        color: string
      }> = []
      const images: Array<Array<unknown>> = []
      const fonts: Array<string> = []
      const context = {
        fillStyle: '',
        set font(value: string) {
          fonts.push(value)
        },
        fillRect(...args: Array<number>) {
          rects.push({
            args,
            color: this.fillStyle,
          })
        },
        fillText: (...args: Array<unknown>) => texts.push(args),
        drawImage: (...args: Array<unknown>) => images.push(args),
        measureText: () => ({width: 240}),
      }
      const exhibit = {
        ...knotExhibition[0],
        harness: undefined,
        author: {model: {title: knotExhibition[0].modelTitle}},
      }
      const icon = {
        naturalWidth: 256,
        naturalHeight: 128,
      } as HTMLImageElement
      drawLabel(context as unknown as CanvasRenderingContext2D, exhibit, x, y, icon)
      expect(fonts).toEqual([labelFonts.number, labelFonts.title, labelFonts.rarity, labelFonts.model])
      expect(rects).toEqual([
        {
          args: [x, y, labelWidth, labelHeight],
          color: labelBackground,
        },
        {
          args: [x + 38, y + 41, 644, 8],
          color: signAccentColor(exhibit.placeholder.color),
        },
        {
          args: [x + 200, y + 264, 320, 52],
          color: labelBackground,
        },
      ])
      const {left} = modelLineLayout(240, true)
      expect(images).toEqual([[icon, x + left, y + 351.5, 50, 25]])
      expect(texts).toEqual([
        [exhibit.label, x + labelWidth / 2, y + 132, 644],
        [exhibit.title, x + labelWidth / 2, y + 225, 644],
        [Array.from({length: exhibit.rarity}, () => '★').join(' '), x + labelWidth / 2, y + 290, 300],
        [exhibit.modelTitle, x + left + 65, y + 364, 240],
      ])
    }
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
      const lines: Array<{
        align: string
        args: Array<unknown>
        font: string
      }> = []
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
      drawLabel(context as unknown as CanvasRenderingContext2D, exhibit, 0, 0)
      expect(lines).toHaveLength(expected ? 5 : 4)
      expect(lines[0].args[1]).toBeGreaterThanOrEqual(0)
      if (expected) {
        expect(lines[4]).toEqual({
          args: [expected, labelWidth / 2, 414, 606],
          font: labelFonts.detail,
          align: 'center',
        })
      }
    }
  })
})
test('star strip paints one through four stars and clears the previous count at any atlas offset', () => {
  for (const rarity of [1, 2, 3, 4] as const) {
    const calls: Array<Array<unknown>> = []
    const context = {
      fillRect: (...args: Array<unknown>) => calls.push(args),
      fillText: (...args: Array<unknown>) => calls.push(args),
    }
    drawRarity(context as unknown as CanvasRenderingContext2D, rarity, 720, 960)
    expect(calls[0]).toEqual([920, 1224, 320, 52])
    expect(calls[1]).toEqual([Array.from({length: rarity}, () => '★').join(' '), 1080, 1250, 300])
  }
})
test('unknown signs leave the star strip blank while preserving the rest of the label', () => {
  const texts: Array<string> = []
  const context = {
    fillRect() {},
    fillText: (text: string) => texts.push(text),
    measureText: () => ({width: 240}),
  }
  const exhibit = {
    ...knotExhibition[0],
    rarity: 0 as const,
  }
  drawLabel(context as unknown as CanvasRenderingContext2D, exhibit, 0, 0)
  expect(texts).toContain(exhibit.title)
  expect(texts).toContain(exhibit.modelTitle)
  expect(texts.some(text => text.includes('★'))).toBe(false)
  expect(texts).not.toContain('')
})
test('returning to unknown clears old stars and marks the existing atlas for upload', () => {
  const calls: Array<Array<unknown>> = []
  const context = {
    fillRect: (...args: Array<unknown>) => calls.push(['clear', ...args]),
    fillText: (...args: Array<unknown>) => calls.push(['text', ...args]),
  }
  const exhibit = knotExhibition[0]
  const atlas = {
    image: {getContext: () => context},
    needsUpdate: false,
  }
  drawRarity(context as unknown as CanvasRenderingContext2D, 4, 0, 0)
  calls.length = 0
  updateRarityAtlas(atlas as unknown as Parameters<typeof updateRarityAtlas>[0], [exhibit], new Map([[exhibit.id, 0]]))
  expect(calls).toEqual([['clear', 200, 264, 320, 52]])
  expect(atlas.needsUpdate).toBe(true)
})
