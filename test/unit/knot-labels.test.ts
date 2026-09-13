import {describe, expect, test} from 'bun:test'

import drawLabel, {knotDetailLine, labelAtlasColumns, labelBackground, labelFonts, labelHeight, labelWidth, modelLineLayout} from '../../src/components/levels/knottingham/KnotLabels/drawLabel.ts'
import {knotBays, knotExhibition} from '../../src/lib/knots/exhibition.ts'
import {knotsById} from '../../src/lib/knots/index.ts'
import {knotSign} from '../../src/lib/knots/signs.ts'

const iconHash = async (id: string) => Bun.hash(await Bun.file(new URL(knotsById.get(id)!.modelIcon)).arrayBuffer())
describe('Knot model plates', () => {
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
      const rects: Array<{args: Array<number>
        color: string}> = []
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
      expect(fonts).toEqual([labelFonts.number, labelFonts.title, labelFonts.model])
      expect(rects).toEqual([
        {
          args: [x, y, labelWidth, labelHeight],
          color: labelBackground,
        },
        {
          args: [x + 38, y + 41, 644, 8],
          color: exhibit.accent,
        },
      ])
      const {left} = modelLineLayout(240, true)
      expect(images).toEqual([[icon, x + left, y + 351.5, 50, 25]])
      expect(texts).toEqual([
        [exhibit.label, x + labelWidth / 2, y + 132, 644],
        [exhibit.title, x + labelWidth / 2, y + 225, 644],
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
      drawLabel(context as unknown as CanvasRenderingContext2D, exhibit, 0, 0)
      expect(lines).toHaveLength(expected ? 4 : 3)
      expect(lines[0].args[1]).toBeGreaterThanOrEqual(0)
      if (expected) {
        expect(lines[3]).toEqual({
          args: [expected, labelWidth / 2, 414, 606],
          font: labelFonts.detail,
          align: 'center',
        })
      }
    }
  })
})
