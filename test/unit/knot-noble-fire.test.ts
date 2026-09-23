import {describe, expect, test} from 'bun:test'

import NobleFire from 'knot-materials/entries/noble_fire/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/noble_fire/Material.ts', import.meta.url)).text()
describe('Noble Fire crystal domains', () => {
  test('constructs the polished black opal with diffraction emission', () => {
    const environment = new Texture
    const material = new NobleFire(environment)
    try {
      expect(material.name).toBe('noble_fire')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
      expect(material.ior).toBe(1.45)
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('matches diffraction identities to irregular boundaries and masks every discontinuous contribution', async () => {
    const text = await source()
    expect(text).not.toContain('cellNoiseVec3(lattice.floor())')
    expect(text).toContain('mx_worley_noise_float(lattice, 1, 1)')
    expect(text).toContain('cellNoiseVec3(vec3(domainId.mul(65_536), 7, 19))')
    expect(text).toContain('const footprint = lattice.fwidth().length()')
    expect(text).toContain('cellularBoundary(lattice).smoothstep(0.025, footprint.add(0.14))')
    expect(text).toContain('fineFlames.mul(resolved).min(1).mul(domainMask)')
    expect(text).toContain('patched.weight.min(1)).mul(domainMask).mul(resolved).mul(0.12)')
  })
  test('confines glitter to bounded inclusions while preserving the angular fire and loop', async () => {
    const text = await source()
    expect(text).toContain('cellNoiseVec3(sphereCoord.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('sphereCoord.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('sphereCoord.fract().sub(sphereCenter).length().smoothstep(0.06, sphereRadius).oneMinus()')
    expect(text).toContain('spheres.sparkle).mul(sphereMask).mul(intimate)')
    expect(0.24).toBeLessThan(0.25)
    expect(text).toContain('p.sub(cameraSide.mul(0.005))')
    expect(text).toContain('const momentum = view.sub(lamp)')
    expect(text).toContain('loopWave(1).mul(6)')
    expect(text).toContain('loopOsc(1, latticeRnd.z.mul(TAU))')
    expect(text).toContain('mix(smooth.fire.mul(1.05), patched.fire,')
  })
})
