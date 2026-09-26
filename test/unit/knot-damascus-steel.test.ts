import {describe, expect, test} from 'bun:test'

import DamascusSteel from 'knot-materials/entries/damascus_steel/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/damascus_steel/Material.ts', import.meta.url)).text()
const drift = (u: number) => (Math.sin(u * Math.PI * 2) * 0.5 + 0.5) * Math.PI * 0.5
describe('Damascus Steel seamless strata', () => {
  test('preserves satin metal and anisotropic shading', () => {
    const environment = new Texture
    const material = new DamascusSteel(environment)
    try {
      expect(material.name).toBe('damascus_steel')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.roughnessNode?.isNode).toBe(true)
      expect(material.metalness).toBe(1)
      expect(material.anisotropy).toBe(0.92)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes the phase itself without changing its fractional overtones', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU).sin().mul(0.5).add(0.5).mul(TAU * 0.25)')
    expect(text).toContain('add(warp.mul(5.4)).add(drift)')
    expect(text).not.toContain('add(tube.x.mul(TAU * 0.25))')
    for (const multiplier of ['2.65', '9.5', '1.35']) {
      expect(text).toContain(`phase.mul(${multiplier})`)
    }
  })
  test('matches phase and slope at the seam for every etched layer', () => {
    const epsilon = 0.0001
    expect(drift(0)).toBeCloseTo(drift(1), 12)
    expect((drift(epsilon) - drift(-epsilon)) / (2 * epsilon)).toBeCloseTo((drift(1 + epsilon) - drift(1 - epsilon)) / (2 * epsilon), 9)
    for (const base of [-4.2, 0, 0.75, 9.3]) {
      for (const frequency of [1, 2.65, 9.5, 1.35]) {
        expect(Math.sin((base + drift(0)) * frequency)).toBeCloseTo(Math.sin((base + drift(1)) * frequency), 12)
      }
    }
    for (let i = 0; i <= 100; i++) {
      expect(drift(i / 100)).toBeGreaterThanOrEqual(0)
      expect(drift(i / 100)).toBeLessThanOrEqual(Math.PI * 0.5)
    }
  })
})
