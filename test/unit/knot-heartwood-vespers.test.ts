import {describe, expect, test} from 'bun:test'

import HeartwoodVespers from 'knot-materials/entries/heartwood_vespers/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/heartwood_vespers/Material.ts', import.meta.url)).text()
describe('Heartwood Vespers filtered grain', () => {
  test('preserves the wood and varnish material', () => {
    const environment = new Texture
    const material = new HeartwoodVespers(environment)
    try {
      expect(material.name).toBe('heartwood_vespers')
      for (const node of [material.colorNode, material.normalNode, material.roughnessNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
      expect(material.clearcoat).toBe(0.48)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('filters rings and fibers before they reach any shading channel', async () => {
    const text = await source()
    expect(text).toContain('phase.fwidth().smoothstep(0.3, 1.5).oneMinus()')
    expect(text).toContain('return mix(float(average), grain, visibility)')
    expect(text).toContain('filteredGrain(ringPhase, 0.08, 0.46, 0.174752597)')
    expect(text).toContain('filteredGrain(ringPhase, 0.03, 0.28, 0.099236287)')
    expect(text).toContain('filteredGrain(fiberPhase, 0.08, 0.48, 0.181488018)')
    expect(text).not.toContain('fiberResolved')
  })
  test('uses accurate grain coverage averages', () => {
    for (const [inner, outer, average] of [[0.08, 0.46, 0.174752597], [0.03, 0.28, 0.099236287], [0.08, 0.48, 0.181488018]]) {
      let sum = 0
      const samples = 10_000
      for (let i = 0; i < samples; i++) {
        const value = Math.abs(Math.sin((i + 0.5) * Math.PI / samples))
        const t = Math.min(1, Math.max(0, (value - inner) / (outer - inner)))
        sum += 1 - t * t * (3 - 2 * t)
      }
      expect(sum / samples).toBeCloseTo(average, 8)
    }
  })
  test('closes the UV contribution to grain distortion', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU).sin().mul(0.35).add(0.35)')
    expect(text).toContain('tube.y.mul(TAU).sin().mul(0.15).add(0.15)')
    expect(text).not.toContain('tube.x.mul(0.7)')
  })
})
