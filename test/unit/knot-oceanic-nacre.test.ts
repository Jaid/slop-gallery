import {describe, expect, test} from 'bun:test'

import OceanicNacre from 'knot-materials/entries/oceanic_nacre/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/oceanic_nacre/Material.ts', import.meta.url)).text()
describe('Oceanic Nacre continuous shell layers', () => {
  test('preserves the displaced iridescent shell', () => {
    const environment = new Texture
    const material = new OceanicNacre(environment)
    try {
      expect(material.name).toBe('oceanic_nacre')
      for (const node of [material.positionNode, material.colorNode, material.normalNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.iridescence).toBe(0.9)
      expect(material.clearcoat).toBe(0.95)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes the shared layer phase without changing object-space detail', async () => {
    const text = await source()
    expect(text).toContain('add(tube.x.mul(TAU * 2))')
    expect(text).not.toContain('tube.x.mul(TAU * 1.5)')
    expect(text).toContain('p.dot(vec3(4.2, 2.7, -3.6)).add(slow.mul(4.4))')
    expect(text).toContain('const layer = warp.sin().mul(0.5).add(0.5)')
    expect(text).toContain('const growthLine = warp.sin().abs().smoothstep(0.035, 0.17).oneMinus()')
    const field = text.slice(text.indexOf('function nacreField'), text.indexOf('export default class'))
    expect(field).not.toContain('.fwidth()')
  })
  test('matches signed layer values and slopes, not merely absolute growth lines', () => {
    for (const phase of [-7.2, -1, 0, 0.7, 2.4]) {
      const wrapped = phase + Math.PI * 4
      expect(Math.sin(wrapped)).toBeCloseTo(Math.sin(phase), 12)
      expect(Math.cos(wrapped)).toBeCloseTo(Math.cos(phase), 12)
    }
    // Three half-turns preserve abs(sin) but invert the signed shell layer.
    expect(Math.abs(Math.sin(0.7 + Math.PI * 3))).toBeCloseTo(Math.abs(Math.sin(0.7)), 12)
    expect(Math.sin(0.7 + Math.PI * 3)).not.toBeCloseTo(Math.sin(0.7), 4)
  })
})
