import {describe, expect, test} from 'bun:test'

import CelestialFelines from 'knot-materials/entries/celestial_felines/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/celestial_felines/Material.ts', import.meta.url)).text()
describe('Celestial Felines seamless nebula', () => {
  test('constructs the celestial glass material', () => {
    const environment = new Texture
    const material = new CelestialFelines(environment)
    try {
      expect(material.name).toBe('celestial_felines')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.iridescence).toBe(0.35)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes nebula colors and traveling pulses without changing the cat sectors', async () => {
    const text = await source()
    expect(text).toContain('nebulaNoise.mul(0.7).add(tube.x.mul(2))')
    expect(text).not.toContain('tube.x.mul(1.5)')
    expect(text).toContain('tube.x.mul(TAU * 5).sub(time.mul(3.2))')
    expect(text).toContain('const sectorFloat = tube.x.mul(3)')
    for (const cat of [1, 2, 3]) {
      expect(text).toContain(`evaluateConstellation(localP, cat${cat}Nodes, cat${cat}Segments`)
    }
  })
  test('matches palette values and slopes across the wrap', () => {
    for (const noise of [-0.7, 0, 0.23, 0.9]) {
      for (const offset of [0.1, 0.35, 0.7]) {
        const start = (noise * 0.7 + offset) * Math.PI * 2
        const end = (noise * 0.7 + 2 + offset) * Math.PI * 2
        expect(Math.cos(start)).toBeCloseTo(Math.cos(end), 12)
        expect(Math.sin(start)).toBeCloseTo(Math.sin(end), 12)
      }
    }
  })
})
