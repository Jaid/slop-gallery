import {describe, expect, test} from 'bun:test'

import SolarLoom from 'knot-materials/entries/solar_loom/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/solar_loom/Material.ts', import.meta.url)).text()
describe('Solar Loom seamless weave', () => {
  test('constructs the gold and carbon cloth', () => {
    const environment = new Texture
    const material = new SolarLoom(environment)
    try {
      expect(material.name).toBe('solar_loom')
      for (const node of [material.colorNode, material.normalNode, material.metalnessNode, material.anisotropyNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoat).toBe(0.48)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses periodic skewed thread directions in both layers', async () => {
    const text = await source()
    expect(text).toContain('weave(tube, vec2(89, 3), vec2(-12, 15))')
    expect(text).toContain('weave(tube.add(0.317), vec2(146, 4), vec2(-19, 24))')
    expect(text).toContain('point.dot(warpCycles).mul(TAU)')
    expect(text).toContain('point.dot(weftCycles).mul(TAU)')
    for (const cycles of [89, 3, -12, 15, 146, 4, -19, 24]) {
      expect(Math.sin(0.37 + cycles * Math.PI * 2)).toBeCloseTo(Math.sin(0.37), 11)
      expect(Math.cos(0.37 + cycles * Math.PI * 2)).toBeCloseTo(Math.cos(0.37), 11)
    }
  })
  test('filters crossings to a stable average for shading and relief', async () => {
    const text = await source()
    expect(text).toContain('mix(float(0.5), crossingPhase.sin().smoothstep(aa.negate(), aa), crossingFootprint.smoothstep(1.5, 5).oneMinus())')
    expect(text).not.toContain('overUnder.select(')
    expect(text).not.toContain('.greaterThan(0)')
    expect(text).toContain('mix(weft.mul(0.62), warp.mul(0.62), overUnder)')
  })
})
