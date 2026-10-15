import {describe, expect, test} from 'bun:test'

import JadeCloisonne from 'knot-materials/entries/jade_cloisonne/Material.ts'
import {Texture} from 'three/webgpu'

import {knotLength} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'
import knotData from '../../packages/knot-materials/src/entries/jade_cloisonne/data.ts'
import {knotGeometryArgs} from '../../packages/knot-materials/src/geometry.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/jade_cloisonne/Material.ts', import.meta.url)).text()
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
const cellLength = knotLength / 36
const vertexSpacing = knotLength / knotGeometryArgs[2]
// Mirrors the shader’s vertex swell over a cell-local offset in cell units.
const swell = (x: number, y: number) => {
  const r = Math.hypot(x, y)
  const cornerR = Math.hypot(Math.abs(x) - 0.5, Math.abs(y) - 0.5)
  return ((1 - smoothstep(0, 0.46, r)) ** 2 + (1 - smoothstep(0, 0.36, cornerR)) ** 2 * 0.8) * 0.0028
}
// Mirrors the shader’s mirror-tiled foil coordinate.
const foil = (t: number) => Math.abs((t * 0.5 - Math.floor(t * 0.5)) * 2 - 1) - 0.5
describe('Jade Cloisonné', () => {
  test('constructs the displaced cloisonné material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new JadeCloisonne(environment)
    try {
      expect(material.name).toBe('jade_cloisonne')
      expect(material.envMap).toBe(environment)
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test('displaces vertices by a smooth cabochon swell instead of sampling the thin cloison wires', async () => {
    const text = await source()
    expect(text).toContain('const swell = r.smoothstep(0, 0.46).oneMinus().pow2().add(cornerR.smoothstep(0, 0.36).oneMinus().pow2().mul(0.8))')
    expect(text).toContain('return position.add(normal.mul(swell.mul(0.0028)))')
    expect(text).not.toContain('wireRibbon')
    // A wire (≤ 0.032 cells wide on each side) is far narrower than the 2.8 cm vertex spacing; the swells span several vertices.
    expect(0.032 * cellLength).toBeLessThan(vertexSpacing / 3)
    expect(0.36 * cellLength).toBeGreaterThan(vertexSpacing * 2.5)
    // Each swell is a radial bump around a point shared by neighboring cells (a medallion center or a cell corner), so it continues smoothly across cell edges: value and slope match on both sides.
    const e = 1e-4
    for (let t = -0.5; t <= 0.5; t += 0.05) {
      expect(Math.abs(swell(0.5 - e, t) - swell(-0.5 + e, t))).toBeLessThan(1e-9)
      expect(Math.abs(swell(t, 0.5 - e) - swell(t, -0.5 + e))).toBeLessThan(1e-9)
      const slopeInside = (swell(0.5 - e, t) - swell(0.5 - 2 * e, t)) / e
      const slopeOutside = (swell(-0.5 + 2 * e, t) - swell(-0.5 + e, t)) / e
      expect(Math.abs(slopeInside - slopeOutside)).toBeLessThan(1e-4)
    }
    // Peak displacement stays within the declared culling and collision bound.
    let peak = 0
    for (let x = -0.5; x <= 0.5; x += 0.01) {
      for (let y = -0.5; y <= 0.5; y += 0.01) {
        peak = Math.max(peak, swell(x, y))
      }
    }
    expect(peak).toBeLessThanOrEqual(0.0028 + 1e-9)
    expect(peak).toBeLessThanOrEqual(knotData.displacement)
  })
  test('mirror-tiles the guilloché foil so rosettes meet without a seam', async () => {
    const text = await source()
    expect(text).toContain('const foilCoord = cells.sub(ray.mul(0.042)).mul(0.5).fract().mul(2).sub(1).abs().sub(0.5)')
    // Cell centers sit at the rosette centers, and the coordinate is continuous across every cell edge.
    for (let cell = 0; cell < 36; cell++) {
      expect(foil(cell + 0.5)).toBeCloseTo(0, 12)
      expect(Math.abs(foil(cell - 1e-7) - foil(cell + 1e-7))).toBeLessThan(1e-6)
    }
    // Both whole-cell counts are even, so the period-two mirror closes over the UV seams.
    expect(36 % 2).toBe(0)
    expect(4 % 2).toBe(0)
  })
  test('confines aventurine sparkles to round flecks inside each glitter cell', async () => {
    const text = await source()
    expect(text).toContain('const aventurineSpark = aventurineFlecks(p, 0.009, 80, 0.5)')
    expect(text).toContain('cellNoiseVec3(q.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('sparkle: facets.sparkle.mul(mask)')
    // Fleck centers lie in [0.25, 0.75] and the support radius never exceeds 0.24, so no fleck touches a cell wall.
    expect(0.25 - 0.24).toBeGreaterThan(0)
  })
})
