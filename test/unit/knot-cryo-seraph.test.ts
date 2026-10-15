import {describe, expect, test} from 'bun:test'

import CryoSeraph from 'knot-materials/entries/cryo_seraph/Material.ts'
import {Texture} from 'three/webgpu'

import knotData from '../../packages/knot-materials/src/entries/cryo_seraph/data.ts'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/cryo_seraph/Material.ts', import.meta.url)).text()
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}
describe('Cryo Seraph', () => {
  test('constructs the displaced frost-over-glacier material without disposing the environment', () => {
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new CryoSeraph(environment)
    try {
      expect(material.name).toBe('cryo_seraph')
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
  test('displaces vertices by a smooth mound per crystal instead of sampling the thin dendrite arms', async () => {
    const text = await source()
    expect(text).toContain('const mound = frost.r.smoothstep(0.1, 1).oneMinus().pow2().mul(frost.id.x.smoothstep(0.12, 0.55))')
    expect(text).toContain('return position.add(normal.mul(mound.mul(0.0085).add(swell)))')
    expect(text).not.toContain('normal.mul(frost.crystal')
    // 256 tubular segments over a ~7.2 m centerline: the mound’s 6.8 cm radius spans several vertices, an arm’s ~6 mm width does not.
    const vertexSpacing = 7.2 / 256
    expect(0.068 * 0.9).toBeGreaterThan(vertexSpacing * 2)
    expect(0.085 * 0.068).toBeLessThan(vertexSpacing)
    // The mound fades out before the nearest Voronoi boundary (≥ 7.9 cm away), where the crystal identity jumps.
    const nearestBoundary = Math.hypot(7.2 / 44 / 2, 2 * Math.PI * 0.13 / 6) / 2 / 0.068
    expect(nearestBoundary).toBeGreaterThan(1)
    expect(1 - smoothstep(0.1, 1, nearestBoundary)).toBe(0)
    // Peak displacement stays within the declared culling and collision bound.
    expect(0.0085 + 0.0032).toBeLessThanOrEqual(knotData.displacement)
  })
  test('confines diamond-dust sparkles to round grains inside each glitter cell', async () => {
    const text = await source()
    expect(text).toContain('const diamondDust = diamondDustGrains(p, 0.011, 85, 0.6)')
    expect(text).toContain('cellNoiseVec3(q.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('sparkle: facets.sparkle.mul(mask)')
    // Grain centers lie in [0.25, 0.75] and the support radius never exceeds 0.24, so no grain touches a cell wall.
    expect(0.25 - 0.24).toBeGreaterThan(0)
  })
})
