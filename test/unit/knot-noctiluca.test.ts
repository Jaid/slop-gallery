import {describe, expect, test} from 'bun:test'

import Noctiluca from 'knot-materials/entries/noctiluca/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/noctiluca/Material.ts', import.meta.url)).text()
describe('Noctiluca plankton', () => {
  test('preserves the displaced water and luminous surface', () => {
    const environment = new Texture
    const material = new Noctiluca(environment)
    try {
      expect(material.name).toBe('noctiluca')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
      expect(material.ior).toBe(1.33)
      expect(material.metalness).toBe(0)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('confines glitter to filtered motes rather than glowing cell faces', async () => {
    const text = await source()
    expect(text).toContain('glitter(p, 0.019, 80, 0.6)')
    expect(text).toContain('const moteCoord = p.div(0.019)')
    expect(text).toContain('cellNoiseVec3(moteCoord.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('moteCoord.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('moteCoord.fract().sub(moteCenter).length().smoothstep(0.06, moteRadius).oneMinus()')
    expect(text).toContain('.mul(mote.sparkle).mul(moteMask).mul(intimate)')
    expect(text).not.toContain('.mul(mote.sparkle).mul(intimate)')
    // Even the widest filter remains inside all six cell faces for every random center.
    for (const center of [0.25, 0.5, 0.75]) {
      expect(center - 0.24).toBeGreaterThan(0)
      expect(center + 0.24).toBeLessThan(1)
    }
  })
})
