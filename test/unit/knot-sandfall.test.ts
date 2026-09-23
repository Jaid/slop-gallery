import {describe, expect, test} from 'bun:test'

import Sandfall from 'knot-materials/entries/sandfall/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/sandfall/Material.ts', import.meta.url)).text()
describe('Sandfall grains', () => {
  test('constructs the dune relief, granular shading and drifting dust', () => {
    const environment = new Texture
    const material = new Sandfall(environment)
    try {
      expect(material.name).toBe('sandfall')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.metalness).toBe(0)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('confines random normals, glitter and garnet coloration to individual grains', async () => {
    const text = await source()
    expect(text).toContain('const random = cellNoiseVec3(q.floor())')
    expect(text).toContain('const center = random.mul(0.5).add(0.25)')
    expect(text).toContain('q.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('q.fract().sub(center).length().smoothstep(0.06, outer).oneMinus()')
    expect(text).toContain('coverage: mask.mul(facets.resolved)')
    expect(text).toContain('lean: facets.lean.mul(mask)')
    expect(text).toContain('sparkle: facets.sparkle.mul(mask)')
    expect(text).toContain('const garnet = grain.random')
    expect(text).toContain('const grainMask = grain.coverage')
    expect(text).not.toContain('floor().mul(0.07)')
    expect(0.24).toBeLessThan(0.25)
  })
  test('filters unresolved ripples to their mean and retains the seamless migrating gust', async () => {
    const text = await source()
    expect(text).toContain('phase.fwidth().smoothstep(0.15, 0.65).oneMinus()')
    expect(text).toContain('finePhase.fwidth().smoothstep(0.15, 0.65).oneMinus()')
    expect(text).toContain('mix(float(0.5), ripple.div(0.74).min(ripple.oneMinus().div(0.26)), rippleVisibility)')
    expect(text).toContain('mix(float(0.5), finePhase.fract().div(0.5).min(finePhase.fract().oneMinus().div(0.5)), fineVisibility)')
    expect(text).toContain('microCoord.fwidth().length().smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('sub(loopTurn.mul(2))')
    expect(text).toContain('add(loopTurn.mul(5))')
    expect(text).toContain('slip.smoothstep(0, 0.12).min(slip.oneMinus().smoothstep(0, 0.12))')
    expect(text).toContain('sandGrains(loopDrift(p, 0.035, 1), 0.0055, 45, 0.9)')
  })
})
