import {describe, expect, test} from 'bun:test'

import SmokyOpal from 'knot-materials/entries/smoky_opal/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/smoky_opal/Material.ts', import.meta.url)).text()
describe('Smoky Opal crystal domains', () => {
  test('preserves the smoky transmissive gemstone', () => {
    const environment = new Texture
    const material = new SmokyOpal(environment)
    try {
      expect(material.name).toBe('smoky_opal')
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.transmission).toBe(0.38)
      expect(material.ior).toBe(1.45)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses matching crystal identities and boundaries for both parallax layers', async () => {
    const text = await source()
    for (const prefix of ['domain', 'deep']) {
      expect(text).toContain(`mx_worley_noise_float(${prefix}Coord, 1, 1)`)
      expect(text).toContain(`cellularBoundary(${prefix}Coord).smoothstep(0, ${prefix}Footprint.add(0.14))`)
      expect(text).toContain(`${prefix}Footprint.smoothstep(0.45, 1.5).oneMinus()`)
    }
    expect(text).toContain('mul(domainRnd.y.smoothstep(0.2, 0.35)).mul(domainMask)')
    expect(text).toContain('mul(near.mul(0.8).add(0.4)).mul(deepMask)')
    expect(text).toContain('deepColor.mul(deepMask).mul(intimate)')
    expect(text).not.toContain('domainCoord.floor()')
    expect(text).not.toContain('deepCoord.floor()')
  })
  test('bounds and filters micro pinfire instead of lighting whole cells', async () => {
    const text = await source()
    expect(text).toContain('sparkRnd.mul(0.5).add(0.25)')
    expect(text).toContain('sparkFootprint.add(0.18).min(0.24)')
    expect(text).toContain('sparkCoord.fract().sub(sparkCenter).length().smoothstep(0.06, sparkRadius).oneMinus()')
    expect(text).toContain('sparkFootprint.smoothstep(0.32, 1.15).oneMinus()')
    expect(text).toContain('mul(near).mul(sparkMask)')
    expect(0.24).toBeLessThan(0.25)
  })
})
