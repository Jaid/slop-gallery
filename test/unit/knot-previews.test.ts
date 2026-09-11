import {expect, test} from 'bun:test'
import {fileURLToPath} from 'node:url'

import {visibleBounds} from '../../scripts/lib/knots/previewLayout.ts'
import updateKnots from '../../scripts/updateKnots.ts'
import {knotCandidates} from '../../src/lib/knots/index.ts'

async function dimensions(url: string) {
  const file = fileURLToPath(url)
  const signature = new Uint8Array(await Bun.file(file).arrayBuffer()).subarray(0, 2)
  expect([...signature]).toEqual([255, 10])
  const size = await Bun.$`magick identify -format '%w %h' ${file}`.text()
  return size.trim().split(' ').map(Number)
}
test('every candidate and item owns a generated JXL, including archived entries', async () => {
  for (const candidate of knotCandidates) {
    expect(candidate.data.icon).toEndWith(`/${candidate.data.id}/icon.jxl`)
    expect(candidate.data.overview).toEndWith(`/${candidate.data.id}/overview.jxl`)
    expect(await dimensions(candidate.data.icon)).toEqual([256, 256])
    expect(await dimensions(candidate.data.overview)).toEqual([1280, Math.max(2, Math.ceil(candidate.select().length / 4)) * 366])
    for (const item of candidate.items) {
      expect(item.icon).toEndWith(`/${item.model}/items/${item.sourceId}/icon.jxl`)
      const [width, height] = await dimensions(item.icon)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(width).toBeLessThanOrEqual(640)
      expect(height).toBeLessThanOrEqual(640)
      expect(Math.min(width, height)).toBeLessThan(640)
      const pixels = await Bun.$`magick ${fileURLToPath(item.icon)} -depth 8 RGBA:-`.arrayBuffer()
      const data = new Uint8ClampedArray(pixels)
      expect(data.some((value, index) => index % 4 === 3 && value === 0)).toBe(true)
      expect(visibleBounds({
        data,
        width,
        height,
      })).toEqual([0, 0, width, height])
    }
  }
}, 60_000)
test('generation rejects unknown candidates before connecting to the browser', async () => {
  await expect(updateKnots({
    candidates: ['../wrong'],
    browserURL: 'invalid',
  })).rejects.toThrow('Unknown Knot candidate')
})
