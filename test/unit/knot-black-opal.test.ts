import {describe, expect, test} from 'bun:test'

import BlackOpalMaterial from 'knot-materials/entries/black_opal/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/black_opal/Material.ts', import.meta.url)).text()
describe('Black Opal diffraction', () => {
  test('constructs both diffraction strata and the polished dark body', () => {
    const environment = new Texture
    const material = new BlackOpalMaterial(environment)
    try {
      expect(material.name).toBe('black_opal')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
      expect(material.ior).toBe(1.45)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('separates irregular grain identities with footprint-filtered dark boundaries', async () => {
    const text = await source()
    expect(text).not.toContain('coord.floor()')
    expect(text).toContain('mx_worley_noise_float(coord, 1, 1)')
    expect(text).toContain('vec3(feature.mul(65_536), 7, 19)')
    expect(text).toContain('const footprint = coord.fwidth().length()')
    expect(text).toContain('cellularBoundary(coord).smoothstep(0.03, footprint.add(0.16))')
    expect(text).toContain('spectralColor.mul(flashLobe).mul(grainMask).mul(float(depthAbsorption))')
  })
  test('keeps refracted parallax and Bragg alignment in the same coordinate space', async () => {
    const text = await source()
    expect(text).toContain('const normal = normalLocal.normalize()')
    expect(text).toContain('refract(view.negate(), normal, float(1 / 1.45)).normalize()')
    for (const lamp of ['A', 'B', 'C']) {
      expect(text).toContain(`lamp${lamp}.sub(refractedRay).normalize()`)
    }
    expect(text).toContain('p.add(refractedRay.mul(0.014))')
    expect(text).toContain('p.add(refractedRay.mul(0.032))')
    expect(text).toContain('cellularPoints(pinCoord, 0.03, 0.16, 0.72)')
    expect(text).toContain("this.colorNode = color('#010103')")
  })
})
