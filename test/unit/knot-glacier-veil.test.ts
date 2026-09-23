import {describe, expect, test} from 'bun:test'

import GlacierVeil from 'knot-materials/entries/glacier_veil/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/glacier_veil/Material.ts', import.meta.url)).text()
describe('Glacier Veil seamless curtains', () => {
  test('constructs the ice and aurora material', () => {
    const environment = new Texture
    const material = new GlacierVeil(environment)
    try {
      expect(material.name).toBe('glacier_veil')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('evaluates both noise octaves on the closed parallax-shifted tube', async () => {
    const text = await source()
    expect(text).toContain('const q = tube.sub(ray.mul(depth))')
    expect(text).toContain('const noisePosition = knotFrame(q).position')
    expect(text).toContain('noisePosition.mul(vec3(3.5, 2.5, 3.5)).add(seed)')
    expect(text).toContain('noisePosition.mul(vec3(9, 6, 9)).add(seed + 5)')
    expect(text).not.toContain('mx_noise_float(vec3(q.x')
  })
  test('preserves all three curtains and their integer-cycle waves', async () => {
    const text = await source()
    expect(text).toContain("curtain(0.3, 3, 1, 1.7, color('#2fff9e'), 1)")
    expect(text).toContain("curtain(0.17, 5, 2, 11.3, color('#3ec4ff'), 2)")
    expect(text).toContain("curtain(0.07, 8, 3, 23.9, color('#b06bff'), 3)")
    expect(text).toContain('q.x.mul(TAU * folds)')
    expect(text).toContain('q.x.mul(TAU * folds * 4)')
    expect(text).toContain('q.y.mul(TAU * bands)')
  })
})
