import {describe, expect, test} from 'bun:test'

import NacrePsalm from 'knot-materials/entries/nacre_psalm/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/nacre_psalm/Material.ts', import.meta.url)).text()
describe('Nacre Psalm seamless lamellae', () => {
  test('preserves the milky layered pearl material', () => {
    const environment = new Texture
    const material = new NacrePsalm(environment)
    try {
      expect(material.name).toBe('nacre_psalm')
      for (const node of [material.colorNode, material.normalNode, material.iridescenceThicknessNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.ior).toBe(1.48)
      expect(material.metalness).toBe(0)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('keeps all three parallax layers periodic', async () => {
    const text = await source()
    expect(text).toContain('front.y.mul(TAU * 5).add(front.x.mul(TAU))')
    expect(text).toContain('middle.y.mul(TAU * 7).sub(middle.x.mul(TAU * 2))')
    expect(text).toContain('deep.y.mul(TAU * 4).add(deep.x.mul(TAU * 3))')
    for (const depth of ['0.026', '0.086', '0.155']) {
      expect(text).toContain(`tube.sub(ray.mul(${depth}))`)
    }
  })
  test('gives interference its own periodic phase rather than fractional layer frequencies', async () => {
    const text = await source()
    expect(text).not.toContain('broadPhase.mul(0.43)')
    expect(text).not.toContain('middlePhase.mul(0.18)')
    expect(text).toContain('front.y.mul(TAU * 2).add(middle.y.mul(TAU)).add(front.x.mul(TAU).sin().mul(0.6))')
    expect(text).toContain('interferencePhase.sin().mul(82).add(370)')
    for (const phase of [0, 0.36, 2.4, -8.3]) {
      for (const cycles of [1, 2, 3, 4, 5, 7]) {
        expect(Math.cos(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.cos(phase), 12)
      }
    }
  })
})
