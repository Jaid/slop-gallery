import {describe, expect, test} from 'bun:test'

import NacreTide from 'knot-materials/entries/nacre_tide/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/nacre_tide/Material.ts', import.meta.url)).text()
describe('Nacre Tide seamless layers', () => {
  test('constructs the layered pearl material', () => {
    const environment = new Texture
    const material = new NacreTide(environment)
    try {
      expect(material.name).toBe('nacre_tide')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.iridescence).toBe(1)
      expect(material.ior).toBe(1.56)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('wraps all six parallax sheets without scaling their periodic phase by a fraction', async () => {
    const text = await source()
    expect(text).toContain('const layers = 6')
    expect(text).toContain('tube.sub(slope.mul(depth * 9))')
    expect(text).toContain('shifted.x.mul(TAU * (2 + Math.floor(index / 3))).add(shifted.y.mul(TAU))')
    expect(text).toContain('knotFrame(shifted).position.mul(4.5).add(index * 1.7)')
    expect(text).toContain('spectralColor(phase.add(index * 0.85)')
    expect(text).not.toContain('phase.mul(0.7)')
    for (let index = 0; index < 6; index++) {
      const phase = 0.37 + index * 0.41
      expect(Math.cos(phase + Math.PI * 2 * (2 + Math.floor(index / 3)))).toBeCloseTo(Math.cos(phase), 12)
      expect(Math.sin(phase + Math.PI * 2)).toBeCloseTo(Math.sin(phase), 12)
    }
  })
  test('closes growth lines, lip tint, relief and thickness around the tube', async () => {
    const text = await source()
    expect(text).toContain('tube.y.mul(TAU * 8)')
    expect(text).toContain('tube.y.mul(TAU * 3).sin().mul(0.5).add(0.5)')
    expect(text).toContain('tube.y.mul(TAU * 6).sin()')
    expect(text).toContain('tube.x.mul(TAU * 2).add(tube.y.mul(TAU)).add(view.y.mul(0.7)).sin().mul(510).add(690)')
    expect(text).not.toContain('.fract()')
    expect(690 - 510).toBeGreaterThan(0)
  })
})
