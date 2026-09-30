import type {KnotMaterialConstructor} from 'knot-materials/types.ts'

import {describe, expect, test} from 'bun:test'

import {Texture} from 'three/webgpu'

const source = (id: string) => Bun.file(new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)).text()
const grain = (u: number, v: number) => {
  const tau = Math.PI * 2
  const radius = Math.cos(v * tau) * 3 / tau + 26 / tau
  return [Math.cos(u * tau) * radius, Math.sin(u * tau) * radius, Math.sin(v * tau) * 3 / tau]
}
const repaired = ['amber_vigil', 'rime_cathedral', 'moire_vespers', 'amber_cosmos', 'neon_relic', 'celestial_brocade']
describe('reviewed knot shader repairs', () => {
  test.each(repaired)('preserves %s identity and caller-owned environment', async id => {
    const url = new URL(`../../packages/knot-materials/src/entries/${id}/Material.ts`, import.meta.url)
    const {default: Material} = await import(url.href) as {default: KnotMaterialConstructor}
    const environment = new Texture
    let disposed = false
    environment.addEventListener('dispose', () => disposed = true)
    const material = new Material(environment)
    try {
      expect(material.name).toBe(id)
      expect(material.envMap).toBe(environment)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.positionNode).toBeNull()
    } finally {
      material.dispose()
      expect(disposed).toBe(false)
      environment.dispose()
    }
  })
  test.each(['amber_vigil', 'rime_cathedral'])('%s refracts the camera ray and keeps valid rays alive', async id => {
    const text = await source(id)
    expect(text).toContain('positionWorld.sub(cameraPosition).normalize()')
    expect(text).toContain('bent.dot(bent).greaterThan(0.25).select(float(1), float(0))')
    expect(text).toContain('mix(reflect(incident, normalWorld), bent, alive)')
    expect(text).not.toContain('positionWorldDirection')
    expect(text).not.toContain('.mul(alive)')
    expect(text).not.toContain('.mul(bent.alive)')
    // Air-to-solid refraction has no total internal reflection, even at grazing incidence.
    for (const ior of [1.31, 1.541, 1.55, 1.568]) {
      for (const cosine of [0, 0.01, 0.5, 1]) {
        const eta = 1 / ior
        const k = 1 - eta ** 2 * (1 - cosine ** 2)
        expect(k).toBeGreaterThan(0)
        const rayLengthSquared = eta ** 2 * (1 - cosine ** 2) + k
        expect(rayLengthSquared).toBeCloseTo(1, 12)
        expect(rayLengthSquared > 0.25).toBe(true)
      }
    }
  })
  test('uses world-space geometric up for frost without feeding its bump normal back into itself', async () => {
    const text = await source('rime_cathedral')
    expect(text).toContain('const up = normalWorldGeometry.y.mul(0.5).add(0.5)')
    expect(text).not.toContain('const up = normalView.y')
    expect(text).not.toContain('const up = normalWorld.y')
  })
  test('evaluates signed even powers without GPU pow domain violations', async () => {
    const studio = await Bun.file(new URL('../../packages/knot-materials/src/candidates/space_bunny/lib/studio.ts', import.meta.url)).text()
    expect(studio).toContain('u.pow2().pow2().add(delta.y.div(halfSize.y).pow2().pow2())')
    expect(await source('moire_vespers')).toContain('cos(seal.angle.mul(6).add(seal.random.y.mul(TAU))).pow2().pow(3)')
    for (const x of [-4, -1, -0.3, 0, 0.3, 1, 4]) {
      expect((x * x) ** 2).toBeCloseTo(x ** 4, 12)
      expect((x * x) ** 3).toBeCloseTo(x ** 6, 12)
    }
  })
  test('wraps holographic seal identities and keeps relief microscopic', async () => {
    const text = await source('moire_vespers')
    expect(text).toContain('q.sub(nearer).mod(vec2(columns, rows))')
    expect(text).toContain('proceduralNormal(engrave.mul(0.001).add(scratches.mul(0.00025)), 0.14)')
  })
  test('confines dust grains to the cell interior, including their antialiasing support', async () => {
    const text = await source('amber_cosmos')
    expect(text).toContain('dustCoordinate.fract().sub(dustCenter).length()')
    expect(text).toContain('const speck = dustGrain.mul(dust.x.smoothstep(0.985, 1))')
    expect(text).toContain('dustFootprint.add(0.14).min(0.24)')
    expect(text).toContain('dustFootprint.smoothstep(0.15, 0.6).oneMinus()')
    for (const footprint of [0, 0.01, 0.2, 1, 10]) {
      const outer = Math.min(footprint + 0.14, 0.24)
      expect(outer).toBeGreaterThan(0.1)
      expect(outer).toBeLessThan(0.25)
    }
  })
  test('joins the neon gas with a fully sodium-colored seam and periodic grain on both wraps', async () => {
    const text = await source('neon_relic')
    expect(text).toContain('tube.x.min(tube.x.oneMinus())')
    expect(text).toContain('seamDistance.smoothstep(0, 0.09).oneMinus()')
    expect(text).toContain('mx_noise_float(grain.add(vec3(0, 0, time.mul(0.4))))')
    expect(text).toContain('mx_noise_float(grain.mul(1.5).add(3.1))')
    for (const t of [0, 0.12, 0.51, 1]) {
      for (let channel = 0; channel < 3; channel++) {
        expect(grain(0, t)[channel]).toBeCloseTo(grain(1, t)[channel], 12)
        expect(grain(t, 0)[channel]).toBeCloseTo(grain(t, 1)[channel], 12)
      }
    }
  })
  test('searches every possible origin of two-cell constellation stitches', async () => {
    const text = await source('celestial_brocade')
    expect(text).toContain('div(edge.dot(edge).max(1e-12)).clamp()')
    expect(text).toContain('for (let i = -2;i <= 2;i++)')
    expect(text).toContain('for (let j = -2;j <= 2;j++)')
    const links = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 1], [2, 1], [1, 2]]
    for (const [dx, dy] of links) {
      // Any point on a segment has its origin within two cells in either dimension.
      for (const t of [0, 0.1, 0.5, 0.99, 1]) {
        const originX = -Math.floor(0.22 + dx * t)
        const originY = -Math.floor(0.77 + dy * t)
        expect(Math.abs(originX)).toBeLessThanOrEqual(2)
        expect(Math.abs(originY)).toBeLessThanOrEqual(2)
      }
    }
  })
})
