import {describe, expect, test} from 'bun:test'

import AbaloneChamber from 'knot-materials/entries/abalone_chamber/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abalone_chamber/Material.ts', import.meta.url)).text()
describe('Abalone Chamber seamless rainbow', () => {
  test('preserves nacre shading and iridescence', () => {
    const environment = new Texture
    const material = new AbaloneChamber(environment)
    try {
      expect(material.name).toBe('abalone_chamber')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.iridescence).toBe(1)
      expect(material.roughness).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes the rainbow separately while preserving the original grooves and view response', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU * 6).add(tube.y.mul(TAU * 18))')
    expect(text).toContain('tube.x.mul(TAU * 2).add(tube.y.mul(TAU * 6))')
    expect(text).toContain('lean.mul(near.mul(2).add(0.6)).mul(0.35)')
    expect(text).not.toContain('spectralColor(phase.mul(0.35)')
    for (const cycles of [2, 6, 18]) {
      for (const phase of [-2.7, 0, 0.81, 6.2]) {
        expect(Math.sin(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.sin(phase), 11)
        expect(Math.cos(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.cos(phase), 11)
      }
    }
  })
  test('uses ordered filtering and continuous object-space bump noise', async () => {
    const text = await source()
    expect(text).toContain('phase.fwidth().smoothstep(0.3, 1.8).oneMinus()')
    expect(text).not.toContain('smoothstep(1.8, 0.3)')
    expect(text).toContain('mx_noise_float(p.mul(vec3(8, 30, 8)))')
    expect(text).not.toContain('mx_noise_float(tube.')
  })
})
