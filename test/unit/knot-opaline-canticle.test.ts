import {describe, expect, test} from 'bun:test'

import OpalineCanticle from 'knot-materials/entries/opaline_canticle/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/opaline_canticle/Material.ts', import.meta.url)).text()
describe('Opaline Canticle crystal regions', () => {
  test('constructs the polished opal and its layered fire', () => {
    const environment = new Texture
    const material = new OpalineCanticle(environment)
    try {
      expect(material.name).toBe('opaline_canticle')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
      expect(material.ior).toBe(1.45)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('fades irregular domains before their lattice identities switch', async () => {
    const text = await source()
    expect(text).not.toContain('cellNoiseVec3(q.floor())')
    expect(text).toContain('mx_worley_noise_float(q, 1, 1)')
    expect(text).toContain('cellNoiseVec3(vec3(domain.mul(65_536), 7, 19))')
    expect(text).toContain('q.fwidth().length().max(0.0001)')
    expect(text).toContain('cellularBoundary(q).smoothstep(0.025, footprint.add(0.14))')
    expect(text).toContain('.mul(domainMask).mul(resolved).mul(gain)')
    expect(text).not.toContain('resolved.mul(0.78).add(0.22)')
  })
  test('keeps the spectrum continuous and preserves all three depth layers and their animation', async () => {
    const text = await source()
    expect(text).not.toContain('.fract()')
    expect(text).toContain('lattice.dot(view).abs().add(shimmer).mul(diameter).sub(0.03).mul(1.6)')
    expect(text).toContain('spectralRamp(band)')
    expect(text).toContain('p.sub(view.mul(depth)).mul(scale)')
    expect(text).toContain('playOfColor(0.09, 2.7, 0.95)')
    expect(text).toContain('playOfColor(0.21, 4.3, 0.26)')
    expect(text).toContain('playOfColor(0.03, 9.5, near.mul(0.45))')
    expect(text).toContain('time.mul(0.13).add(identity.x.mul(41))')
    expect(text).toContain('time.mul(0.21).add(identity.x.mul(24))')
    expect(text).toContain('filament(mx_noise_float(p.mul(9.5))')
  })
})
