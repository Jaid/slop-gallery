import {describe, expect, test} from 'bun:test'

import LivingKintsugi from 'knot-materials/entries/living_kintsugi/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/living_kintsugi/Material.ts', import.meta.url)).text()
describe('Living Kintsugi stable heartbeat', () => {
  test('constructs the gold-inlaid lacquer', () => {
    const environment = new Texture
    const material = new LivingKintsugi(environment)
    try {
      expect(material.name).toBe('living_kintsugi')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.roughnessNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses nonnegative GPU power bases and bounded material interpolation', async () => {
    const text = await source()
    expect(text).toContain('time.mul(1.6).sin().abs().pow(6)')
    expect(text).not.toContain('sin().pow(6)')
    expect(text).toContain('const thermalBlend = incandescentHeat.clamp()')
    expect(text).toContain('mix(goldGradient, whiteHotCore, thermalBlend)')
    expect(text).toContain('mix(float(0.14), float(0.04), thermalBlend)')
    expect(text).toContain('activeGold.mul(incandescentHeat)')
  })
  test('keeps gold roughness positive throughout the full heartbeat and flow ranges', () => {
    for (let i = 0; i <= 100; i++) {
      const heartbeat = Math.abs(Math.sin(i * Math.PI * 2 / 100)) ** 6
      expect(Number.isFinite(heartbeat)).toBe(true)
      for (const flow of [0, 0.5, 1]) {
        const heat = heartbeat * 0.5 + 0.75 + flow * 0.35
        const blend = Math.min(1, Math.max(0, heat))
        const roughness = 0.14 * (1 - blend) + 0.04 * blend
        expect(roughness).toBeGreaterThanOrEqual(0.04)
        expect(roughness).toBeLessThanOrEqual(0.14)
      }
    }
  })
  test('uses ordered smoothing ranges for all fracture masks', async () => {
    const text = await source()
    expect(text).toContain('smoothstep(0.002, 0.042).oneMinus()')
    expect(text).toContain('smoothstep(0.001, 0.016).oneMinus()')
    expect(text).toContain('smoothstep(0.002, 0.014).oneMinus()')
    expect(text).toContain('smoothstep(0.01, 0.16).oneMinus()')
  })
})
