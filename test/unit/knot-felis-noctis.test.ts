import {describe, expect, test} from 'bun:test'

import FelisNoctis from 'knot-materials/entries/felis_noctis/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/felis_noctis/Material.ts', import.meta.url)).text()
describe('Felis Noctis finite constellation glow', () => {
  test('constructs the celestial atlas material', () => {
    const environment = new Texture
    const material = new FelisNoctis(environment)
    try {
      expect(material.name).toBe('felis_noctis')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.roughnessNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(0.42)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('guards the signed sine before GPU exponentiation', async () => {
    const text = await source()
    expect(text).toContain('.add(phase).sin().abs().pow(8).mul(0.65).add(0.35)')
    expect(text).not.toContain('.sin().pow(8)')
    expect(text).toContain('const cat = constellation(p, phase)')
    expect(text).toContain('const starlight = vec3(mix(cold, warm, identity.smoothstep(0.32, 0.84)))')
  })
  test('preserves the even-powered pulse on both halves of every cycle', () => {
    for (let i = -100; i <= 100; i++) {
      const sine = Math.sin(i * Math.PI / 50)
      const base = Math.abs(sine)
      const pulse = base ** 8 * 0.65 + 0.35
      expect(base).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(pulse)).toBe(true)
      expect(pulse).toBeCloseTo(sine ** 8 * 0.65 + 0.35, 14)
      expect(pulse).toBeGreaterThanOrEqual(0.35)
      expect(pulse).toBeLessThanOrEqual(1)
    }
  })
})
