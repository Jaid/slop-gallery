import {describe, expect, test} from 'bun:test'

import TourmalineNebula from 'knot-materials/entries/tourmaline_nebula/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/tourmaline_nebula/Material.ts', import.meta.url)).text()
const crystal = (u: number, v: number) => {
  const tau = Math.PI * 2
  const facet = u * tau * 3 + Math.sin(v * tau) * 0.4
  return [Math.sin(facet), Math.sin(u * tau * 22 + Math.sin(v * tau * 3))]
}
describe('Tourmaline Nebula closed crystal bands', () => {
  test('preserves the translucent iridescent crystal', () => {
    const environment = new Texture
    const material = new TourmalineNebula(environment)
    try {
      expect(material.name).toBe('tourmaline_nebula')
      for (const node of [material.positionNode, material.colorNode, material.normalNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.transmission).toBe(0.34)
      expect(material.ior).toBe(1.62)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses a periodic vertex-safe field without changing nebula or inclusions', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU * 3).add(tube.y.mul(TAU).sin().mul(0.4))')
    expect(text).toContain('tube.x.mul(TAU * 22).add(tube.y.mul(TAU * 3).sin())')
    expect(text).toContain('starfield(view, 32, 0.972)')
    expect(text).toContain('mx_fractal_noise_float(p.mul(3.4)')
    const field = text.slice(text.indexOf('function crystalField'), text.indexOf('export default class'))
    expect(field).not.toContain('.fwidth()')
  })
  test('matches both crystal profiles at both UV wraps', () => {
    for (const t of [0, 0.19, 0.47, 0.83, 1]) {
      for (let i = 0; i < 2; i++) {
        expect(crystal(0, t)[i]).toBeCloseTo(crystal(1, t)[i], 11)
        expect(crystal(t, 0)[i]).toBeCloseTo(crystal(t, 1)[i], 11)
      }
    }
  })
})
