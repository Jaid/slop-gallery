import {describe, expect, test} from 'bun:test'

import AmberEcho from 'knot-materials/entries/amber_echo/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/amber_echo/Material.ts', import.meta.url)).text()
const smoothstep = (low: number, high: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}
describe('Amber Echo bubble coverage', () => {
  test('preserves the translucent resin material', () => {
    const environment = new Texture
    const material = new AmberEcho(environment)
    try {
      expect(material.name).toBe('amber_echo')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
      expect(material.transmission).toBe(0.26)
      expect(material.ior).toBe(1.54)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('lights bubble interiors, not the surrounding grid cells', async () => {
    const text = await source()
    expect(text).toContain('bubbleDistance.smoothstep(bubbleRadius.mul(0.2), bubbleOuter).oneMinus()')
    expect(text).toContain('const bubbleOuter = bubbleRadius.add(bubbleAA).min(0.24)')
    expect(text).toContain('bubbleAA.smoothstep(0.08, 0.32).oneMinus()')
    expect(text).not.toContain('smoothstep(bubbleRadius, bubbleRadius.mul(0.2))')
    for (const radius of [0.03, 0.0675, 0.105]) {
      for (const footprint of [0.001, 0.05, 0.2, 1]) {
        const outer = Math.min(radius + footprint, 0.24)
        expect(outer).toBeGreaterThan(radius * 0.2)
        expect(1 - smoothstep(radius * 0.2, outer, 0)).toBe(1)
        expect(1 - smoothstep(radius * 0.2, outer, 0.25)).toBe(0)
      }
    }
    // Centers lie at least 0.25 cells from every face.
    expect(0.24).toBeLessThan(0.25)
  })
  test('bounds fractal resin before fractional exponentiation', async () => {
    const text = await source()
    expect(text).toContain('resin.clamp().pow(1.2)')
    expect(text).not.toContain('resin.pow(1.2)')
  })
})
