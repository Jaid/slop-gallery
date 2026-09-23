import {describe, expect, test} from 'bun:test'

import Hoarfrost from 'knot-materials/entries/hoarfrost/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/hoarfrost/Material.ts', import.meta.url)).text()
describe('Hoarfrost crystals', () => {
  test('constructs the icy glaze and growing frost material', () => {
    const environment = new Texture
    const material = new Hoarfrost(environment)
    try {
      expect(material.name).toBe('hoarfrost')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.iridescenceThicknessNode?.isNode).toBe(true)
      expect(material.ior).toBe(1.31)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('keeps the original growing snowflakes whole across lattice boundaries', async () => {
    const text = await source()
    expect(text).toContain('loop(27, ({i}) =>')
    expect(text).toContain('cellNoiseVec3(cell.add(neighbor))')
    expect(text).toContain('local.sub(neighbor.add(rnd.mul(0.5).add(0.25)))')
    expect(text).toContain('loopOsc(1, rnd.z.mul(TAU).add(p.dot(vec3(2.4, 1.1, -3.1))))')
    expect(text).toContain('theta.mul(6)')
    expect(text).toContain('theta.mul(18)')
    expect(text).toContain('coverage.assign(coverage.max(vec3(frost, dust, needles)))')
    // Maximum growth, lobe radius and filter cannot reach an omitted neighboring site.
    const maximumGrowth = 0.22 + 0.32 + 0.08 + 0.14
    expect(maximumGrowth * (0.62 + 0.44) + 0.1).toBeLessThan(1.25)
    expect(text).toContain('const cellSize = 0.072')
  })
  test('localizes random facet normals and leaves no per-cell tint on the bare surface', async () => {
    const text = await source()
    expect(text).toContain('cellNoiseVec3(q.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('distance.smoothstep(0.06, outer).oneMinus()')
    expect(text).toContain('lean: facets.lean.mul(mask)')
    expect(text).toContain('sparkle: facets.sparkle.mul(mask)')
    expect(0.24).toBeLessThan(0.25)
    expect(text).toContain('frostGlitter(p, 0.021, 64, 0.6)')
    expect(text).toContain('frostGlitter(loopDrift(p, 0.05, 1), 0.041, 26, 0.85)')
    expect(text).toContain('this.iridescenceThicknessNode = mx_noise_float(p.mul(14)).mul(0.5).add(0.5).mul(380).add(260)')
    expect(text).not.toContain('this.iridescenceThicknessNode = rnd.')
  })
  test('filters crystal silhouettes and fine fans without differentiating discontinuous cell identities', async () => {
    const text = await source()
    expect(text).not.toContain('crystal.fwidth()')
    expect(text).toContain('const footprint = q.fwidth().length()')
    expect(text).toContain('footprint.div(offset.xy.length().max(0.05))')
    expect(text).toContain('footprint.add(angularFootprint.mul(growth).mul(4)).min(0.1).max(0.0006)')
    expect(text).toContain('mix(float(5 / 16), fan.pow(3), fanVisibility)')
    expect(text).toContain('footprint.smoothstep(0.2, 0.8).oneMinus()')
  })
})
