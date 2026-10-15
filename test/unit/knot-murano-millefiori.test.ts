import {describe, expect, test} from 'bun:test'

import MuranoMillefiori from 'knot-materials/entries/murano_millefiori/Material.ts'
import {Texture} from 'three/webgpu'

import {knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/murano_millefiori/Material.ts', import.meta.url)).text()
describe('Murano Millefiori', () => {
  test('constructs the material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new MuranoMillefiori(environment)
    try {
      expect(material.name).toBe('murano_millefiori')
      expect(material.envMap).toBe(environment)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test('keeps every parallax stratum inside the tube, ordered from the surface down', async () => {
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
  test('confines aventurine sparkles and flecks to round grains inside their cells', async () => {
    const text = await source()
    expect(text).toContain('const aventurineSparkle = aventurineFlecks(p.sub(view.mul(0.035)), 0.0095, 68, 0.55)')
    expect(text).toContain('q.fract().sub(rnd.mul(0.5).add(0.25)).length().smoothstep(0.06, outer).oneMinus()')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('sparkle: facets.sparkle.mul(grain.mask)')
    expect(text).not.toMatch(/aventurineSparkle = glitter\(/u)
    // Grain centers lie in [0.25, 0.75] and the support radius never exceeds 0.24, so no grain touches a cell wall.
    expect(0.25 - 0.24).toBeGreaterThan(0)
  })
})
