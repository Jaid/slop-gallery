import {describe, expect, test} from 'bun:test'

import GildedSumi from 'knot-materials/entries/gilded_sumi/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/gilded_sumi/Material.ts', import.meta.url)).text()
describe('Gilded Sumi seamless currents', () => {
  test('constructs the lacquer and gold material', () => {
    const environment = new Texture
    const material = new GildedSumi(environment)
    try {
      expect(material.name).toBe('gilded_sumi')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.metalnessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses whole cycles while preserving three distinct parallax depths', async () => {
    const text = await source()
    expect(text).toContain('tube.sub(ray.mul(0.024))')
    expect(text).toContain('tube.sub(ray.mul(0.085))')
    expect(text).toContain('tube.sub(ray.mul(0.15))')
    expect(text).toContain('front.y.mul(TAU * 5).add(front.x.mul(TAU))')
    expect(text).toContain('middle.y.mul(TAU * 7).sub(middle.x.mul(TAU * 3))')
    expect(text).toContain('deep.y.mul(TAU * 3).add(deep.x.mul(TAU * 5))')
    for (const cycles of [1, 3, 5, 7]) {
      for (const phase of [0, 0.71, 3.9, -12.1]) {
        expect(Math.sin(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.sin(phase), 12)
      }
    }
  })
  test('confines random tint to leaf inclusions rather than cutting the gold edges into cells', async () => {
    const text = await source()
    expect(text).toContain('mix(mx_noise_float(p.mul(19)).mul(0.5).add(0.5), leaf.random.x, goldLeaf)')
    expect(text).toContain('goldVariation.mul(0.72).add(edge.mul(0.2))')
    expect(text).not.toContain('leaf.random.x.mul(0.72)')
  })
})
