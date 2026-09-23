import {describe, expect, test} from 'bun:test'

import Shatterlight from 'knot-materials/entries/shatterlight/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/shatterlight/Material.ts', import.meta.url)).text()
describe('Shatterlight mirror fragments', () => {
  test('constructs the metallic mirror with moving facets', () => {
    const environment = new Texture
    const material = new Shatterlight(environment)
    try {
      expect(material.name).toBe('shatterlight')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.metalness).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('matches facet identity to gold seams and applies tilt to actual reflection normals', async () => {
    const text = await source()
    expect(text).not.toContain('const cell = scale.floor()')
    expect(text).toContain('mx_worley_noise_float(scale, 1, 1)')
    expect(text).toContain('vec3(domain.mul(65_536), 7, 19)')
    expect(text).toContain('const shardMask = seam.smoothstep(0.05, filter.add(0.1))')
    expect(text).toContain('normalViewGeometry.add(tilt.mul(shardMask))')
    expect(text).toContain('proceduralNormal(relief, 0.0006).add(tilt.mul(shardMask)).add(fineTilt)')
    expect(text).toContain('mx_worley_noise_float(fineCoord, 1, 1)')
    expect(text).toContain('cellularBoundary(fineCoord).smoothstep(0.025, fineCoord.fwidth().length().add(0.12)).mul(shardMask)')
    expect(text).toContain('mix(float(0.5), rnd.y, shardMask)')
    expect(text).toContain('mix(float(0.5), rnd.z, shardMask)')
  })
  test('keeps seam coverage continuous and engraving independent of random shard identities', async () => {
    const text = await source()
    expect(text).toContain('const filter = scale.fwidth().length().mul(0.7)')
    expect(text).toContain('seam.smoothstep(0, filter.add(0.012)).oneMinus()')
    expect(text).toContain('seam.smoothstep(0.012, filter.add(0.05)).oneMinus()')
    expect(text).not.toContain('seam.add(filter)')
    expect(text).toContain('p.mul(vec3(180, 70, 120))')
    expect(text).toContain('chasingCoord.fwidth().length().smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('chasing.mul(goldMask).mul(0.012)')
    expect(text).toContain('loopWave(1, identity.mul(TAU)')
  })
  test('confines micro-glitter normals and light to bounded inclusions', async () => {
    const text = await source()
    expect(text).toContain('cellNoiseVec3(speckCoord.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('speckCoord.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('speckCoord.fract().sub(speckCenter).length().smoothstep(0.06, speckOuter).oneMinus()')
    expect(text).toContain('const sparkle = speck.sparkle.mul(speckMask)')
    expect(text).toContain('speck.lean.mul(speckMask).mul(0.12)')
    expect(text).toContain('speck.resolved.mul(speckMask).mul(0.004)')
    expect(0.24).toBeLessThan(0.25)
  })
})
