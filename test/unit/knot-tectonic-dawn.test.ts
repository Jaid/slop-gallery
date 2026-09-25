import {describe, expect, test} from 'bun:test'

import TectonicDawn from 'knot-materials/entries/tectonic_dawn/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/tectonic_dawn/Material.ts', import.meta.url)).text()
describe('Tectonic Dawn mineral inclusions', () => {
  test('constructs the fractured volcanic glass', () => {
    const environment = new Texture
    const material = new TectonicDawn(environment)
    try {
      expect(material.name).toBe('tectonic_dawn')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoat).toBe(0.72)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses the same warped crystal field for identities and fracture boundaries', async () => {
    const text = await source()
    expect(text).toContain('mx_worley_noise_vec3(crystalPosition, 1, 0)')
    expect(text).toContain('mx_worley_noise_float(crystalPosition, 1, 1)')
    expect(text).toContain('const identity = mix(vec3(0.5), crystalRandom, interior)')
    expect(text).toContain('boundary.smoothstep(0, footprint.add(0.14))')
    expect(text).toContain('smoothstep(0.014, footprint.add(0.052))')
    expect(text).not.toContain('cellNoiseVec3(domain.floor())')
  })
  test('confines bright inclusions to filtered points rather than entire cells', async () => {
    const text = await source()
    expect(text).toContain('inclusionRandom.mul(0.5).add(0.25)')
    expect(text).toContain('inclusionFootprint.add(0.18).min(0.24)')
    expect(text).toContain('inclusionCoord.fract().sub(inclusionCenter).length().smoothstep(0.06, inclusionRadius).oneMinus()')
    expect(text).toContain('inclusionRandom.z.smoothstep(0.82, 0.96).mul(inclusionMask)')
    expect(text).toContain('inclusionFootprint.smoothstep(0.32, 1.15).oneMinus()')
    expect(0.24).toBeLessThan(0.25)
  })
})
