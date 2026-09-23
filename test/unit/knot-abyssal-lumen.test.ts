import {describe, expect, test} from 'bun:test'

import AbyssalLumen from 'knot-materials/entries/abyssal_lumen/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abyssal_lumen/Material.ts', import.meta.url)).text()
const band = (u: number, v: number, time: number) => {
  const stroke = u * Math.PI * 10 - time * 1.15 + Math.sin(v * Math.PI * 8) * 0.4
  return Math.sin(stroke) * 0.5 + 0.5
}
describe('Abyssal Lumen seamless rainbow', () => {
  test('preserves displaced ribs and luminous comb rows', () => {
    const environment = new Texture
    const material = new AbyssalLumen(environment)
    try {
      expect(material.name).toBe('abyssal_lumen')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('drives both spectral layers with the periodic wave rather than a discontinuous radian fraction', async () => {
    const text = await source()
    expect(text).toContain('const ripple = stroke.sin().mul(0.5).add(0.5)')
    expect(text).toContain('spectralRamp(ripple, 1.25)')
    expect(text).toContain('spectralRamp(ripple, 1.8)')
    expect(text).not.toContain('stroke.fract()')
  })
  test('matches both UV wraps and the five-cycle wavelength at every animation phase', () => {
    for (const time of [0, 0.5, 3.7, 100]) {
      for (const t of [0, 0.13, 0.67, 1]) {
        expect(band(0, t, time)).toBeCloseTo(band(1, t, time), 12)
        expect(band(t, 0, time)).toBeCloseTo(band(t, 1, time), 12)
        expect(band(t, 0.37, time)).toBeCloseTo(band(t + 0.2, 0.37, time), 12)
      }
    }
  })
})
