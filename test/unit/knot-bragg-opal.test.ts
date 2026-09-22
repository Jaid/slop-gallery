import {describe, expect, test} from 'bun:test'

import BraggOpalMaterial from 'knot-materials/entries/bragg_opal/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/bragg_opal/Material.ts', import.meta.url)).text()
describe('Bragg Opal domains', () => {
  test('constructs the translucent opal with spectral fire and recessed boundaries', () => {
    const environment = new Texture
    const material = new BraggOpalMaterial(environment)
    try {
      expect(material.name).toBe('bragg_opal')
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.transmission).toBe(0.88)
      expect(material.dispersion).toBe(0.35)
      expect(material.ior).toBe(1.45)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses matching Voronoi identities and filtered borders for the crystal domains', async () => {
    const text = await source()
    expect(text).not.toContain('domainCoord.floor()')
    expect(text).toContain('mx_worley_noise_float(domainCoord, 1, 1)')
    expect(text).toContain('cellNoiseVec3(vec3(domainId.mul(65_536), 7, 19))')
    expect(text).toContain('cellularBoundary(domainCoord)')
    expect(text).toContain('const footprint = domainCoord.fwidth().length()')
    expect(text).toContain('boundary.smoothstep(0.02, footprint.add(0.08)).oneMinus()')
    expect(text).toContain('.mul(tileEdge.oneMinus())')
  })
  test('keeps view alignment local and pinfire tints independent of domain boundaries', async () => {
    const text = await source()
    expect(text).not.toContain('positionViewDirection')
    expect(text).toContain('const {p, view, grazing, rim, near, intimate} = viewerFrame()')
    expect(text).toContain('lamp.add(view).normalize()')
    expect(text).toContain('braggDiffraction(latticeNormal, halfVector, dSpacing, 45)')
    expect(text).toContain('cellularPoints(pinCoord, 0.03, 0.18, 0.6).mul(near)')
    expect(text).toContain('const pinIdentity = cellNoiseVec3(pinCoord.floor())')
    expect(text).toContain("mix(color('#ff2060'), color('#00f0a0'), pinIdentity.y)")
  })
})
