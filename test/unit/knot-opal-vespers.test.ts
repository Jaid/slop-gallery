import {describe, expect, test} from 'bun:test'

import OpalVespers from 'knot-materials/entries/opal_vespers/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/opal_vespers/Material.ts', import.meta.url)).text()
describe('Opal Vespers inclusions', () => {
  test('constructs black opal with relief and angular fire', () => {
    const environment = new Texture
    const material = new OpalVespers(environment)
    try {
      expect(material.name).toBe('opal_vespers')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.ior).toBe(1.45)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('evaluates whole neighboring patches and preserves their original sizes and animation', async () => {
    const text = await source()
    for (const axis of ['x', 'y', 'z']) {
      expect(text).toContain(`for (let ${axis} = -1;${axis} <= 1;${axis}++)`)
    }
    expect(text).toContain('cellNoiseVec3(identity)')
    expect(text).toContain('local.sub(offset.add(rnd.mul(0.42).add(0.29))).length()')
    expect(text).toContain('const reach = rnd.z.mul(0.18).add(0.46)')
    expect(text).toContain('const filter = footprint.min(0.1)')
    expect(0.46 + 0.18 + 0.1).toBeLessThan(1.29)
    expect(text).toContain('time.mul(0.7).add(rnd.x.mul(TAU))')
    expect(text).toContain('tintSum.div(coverage.max(0.000001))')
  })
  test('confines vein relief to each patch and keeps derivative-free vertex coverage', async () => {
    const text = await source()
    expect(text).toContain('const raw = dist.smoothstep(reach.mul(0.28), reach).oneMinus()')
    expect(text).toContain('rawPatch = rawPatch.max(raw)')
    expect(text).toContain('add(rawPatch.mul(0.004))')
    expect(text).toContain('veinRelief = veinRelief.max(core.mul(mask))')
    expect(text).toContain('proceduralNormal(patch.mul(0.004).add(milk.mul(0.007)).add(veinRelief.mul(0.0005)), 1)')
    expect(text).not.toContain('opticalBands(')
    expect(text).toContain('phase.cos().mul(bandVisibility).mul(0.5).add(0.5)')
  })
  test('fades unresolved pinfire and gives each dot an independent optical identity', async () => {
    const text = await source()
    expect(text).toContain('pinScale.fwidth().length().smoothstep(0.16, 0.48).oneMinus()')
    expect(text).toContain('cellularPoints(pinScale, 0.02, 0.08, 0.74)')
    expect(text).toContain('const pinIdentity = cellNoiseVec3(pinScale.floor())')
    expect(text).toContain('pinIdentity.x.mul(TAU).add(orbit).add(pinAlign.mul(1.4))')
    expect(text).toContain('spectralColor(pinHue).mul(pins).mul(pinFade).mul(proximity)')
  })
})
