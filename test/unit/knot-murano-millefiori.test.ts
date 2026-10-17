import {expect, test} from 'bun:test'

import {knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/murano_millefiori/Material.ts', import.meta.url)).text()
test('Murano Millefiori keeps every parallax stratum inside the tube, ordered from the surface down', async () => {
  const text = await source()
  const block = /const caneDepths = \{(?<body>[^}]+)\}/u.exec(text)!.groups!.body
  const caneDepths: Record<string, number> = Object.fromEntries(block.matchAll(/(?<name>\w+): (?<value>[\d.]+)/gu).map(match => [match.groups!.name, Number(match.groups!.value)]))
  const depths = [caneDepths.top, caneDepths.mid, caneDepths.ribbon, caneDepths.deep]
  expect(depths.every(Number.isFinite)).toBe(true)
  for (const [index, depth] of depths.entries()) {
    expect(depth).toBeGreaterThan(index ? depths[index - 1] : 0)
    expect(depth).toBeLessThan(knotTubeRadius)
  }
  expect(text).toContain('tube.sub(ray.mul(caneDepths.top))')
  expect(text).toContain('tube.sub(ray.mul(caneDepths.mid))')
  expect(text).toContain('tube.sub(ray.mul(caneDepths.deep))')
  // The ribbon’s twist coordinate runs 36 periods per UV unit, so its parallax shift is scaled by the same factor.
  expect(text).toContain('ray.x.mul(36 * caneDepths.ribbon)')
})
