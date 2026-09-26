import {describe, expect, test} from 'bun:test'

import MycelialLumen from 'knot-materials/entries/mycelial_lumen/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/mycelial_lumen/Material.ts', import.meta.url)).text()
describe('Mycelial Lumen connected filaments', () => {
  test('constructs the displaced living membrane', () => {
    const environment = new Texture
    const material = new MycelialLumen(environment)
    try {
      expect(material.name).toBe('mycelial_lumen')
      for (const node of [material.positionNode, material.normalNode, material.colorNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.ior).toBe(1.37)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses whole-cycle root, fine, broad and pulse fields', async () => {
    const text = await source()
    for (const count of [4, 11, 26]) {
      expect(text).toContain(`tube.x.mul(TAU * ${count})`)
    }
    expect(text).toContain('tube.y.mul(TAU * 4)')
    expect(text).toContain('tube.y.mul(TAU * 2)')
    expect(text).toContain('tube.y.mul(TAU * 3)')
    expect(text).toContain('tube.y.mul(TAU).sin()')
    expect(text).toContain('time.mul(1.8).add(tube.x.mul(TAU).sin())')
    for (const cycles of [1, 2, 3, 4, 11, 26]) {
      for (const phase of [0, 0.27, 3.4, -9]) {
        expect(Math.sin(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.sin(phase), 11)
        expect(Math.cos(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.cos(phase), 11)
      }
    }
  })
  test('confines random spore relief to smooth spots and stays vertex-safe', async () => {
    const text = await source()
    expect(text).toContain('q.floor().mod(vec2(22, 9))')
    expect(text).toContain('knots.xy.mul(0.5).add(0.25)')
    expect(text).toContain('q.fract().sub(center).length().smoothstep(0.04, 0.18).oneMinus()')
    expect(text).toContain('mul(fine.mul(0.6).add(0.4)).mul(sporeMask)')
    const field = text.slice(text.indexOf('function rootField'), text.indexOf('export default class'))
    expect(field).not.toContain('.fwidth()')
    expect(0.18).toBeLessThan(0.25)
  })
})
