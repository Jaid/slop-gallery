import {describe, expect, test} from 'bun:test'

import FrozenFire from 'knot-materials/entries/frozen_fire/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/frozen_fire/Material.ts', import.meta.url)).text()
describe('Frozen Fire diffraction', () => {
  test('constructs the polished opal and spectral bands', () => {
    const environment = new Texture
    const material = new FrozenFire(environment)
    try {
      expect(material.name).toBe('frozen_fire')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.iridescenceThicknessNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(0.6)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('confines every grain-dependent surface effect to matching irregular domains', async () => {
    const text = await source()
    expect(text).not.toContain('const grain = cellNoiseVec3(q)')
    expect(text).toContain('mx_worley_noise_float(q, 1, 1)')
    expect(text).toContain('cellNoiseVec3(vec3(domain.mul(65_536), 7, 19))')
    expect(text).toContain('cellularBoundary(q).smoothstep(0.025, footprint.add(0.14)).mul(resolved)')
    expect(text).toContain('bands.mul(facing).mul(patchMask).mul(0.0009)')
    expect(text).toContain('bands.mul(facing).mul(patchMask).mul(0.55)')
    expect(text).toContain('mix(float(0.5), grain.x, patchMask).mul(240).add(300)')
    expect(text).toContain('.mul(facing).mul(patchMask).mul(intimate')
  })
  test('filters bands from continuous coordinates and leaves pinfire independent of large grain identities', async () => {
    const text = await source()
    expect(text).not.toContain('opticalBands(')
    expect(text).not.toContain('digit.fwidth()')
    expect(text).toContain('const footprint = q.fwidth().length()')
    expect(text).toContain('phaseFootprint.smoothstep(0.6, 3).oneMinus()')
    expect(text).toContain('digit.mul(TAU).add(0.3).cos().mul(bandVisibility).mul(0.5).add(0.5)')
    expect(text).toContain('spectralColor(pin.random.x.mul(TAU).add(view.dot(n).mul(2.2)).add(time.mul(0.05)))')
    expect(text).toContain('pinFire.mul(pin.mask).mul(near).mul(1.4)')
    expect(text).not.toContain('fire.mul(pin.core)')
    expect(text).toContain('const warp = mx_noise_vec3(p.mul(2.6)).mul(0.22)')
    expect(text).toContain('const flame = fire.mul(fire).mul(1.25)')
  })
})
