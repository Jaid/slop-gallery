import {describe, expect, test} from 'bun:test'

import AbyssalCoral from 'knot-materials/entries/abyssal_coral/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abyssal_coral/Material.ts', import.meta.url)).text()
const chalk = (noise: number) => Math.min(1, Math.max(0, noise * 0.5 + 0.5)) ** 1.45
describe('Abyssal Coral finite chalk color', () => {
  test('constructs the coral relief and living polyps', () => {
    const environment = new Texture
    const material = new AbyssalCoral(environment)
    try {
      expect(material.name).toBe('abyssal_coral')
      for (const node of [material.colorNode, material.positionNode, material.normalNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.metalness).toBe(0.01)
      expect(material.sheen).toBe(0.2)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('bounds the fractal color before the fractional power', async () => {
    const text = await source()
    expect(text).toContain('coralField.mul(0.5).add(0.5).clamp().pow(1.45)')
    expect(text).not.toContain('coralField.mul(0.5).add(0.5).pow(1.45)')
    const amplitudeSum = 1 + 0.56 + 0.56 ** 2 + 0.56 ** 3
    expect(amplitudeSum).toBeGreaterThan(1)
    expect(Number.isNaN((-1.01 * 0.5 + 0.5) ** 1.45)).toBe(true)
    for (const value of [-amplitudeSum, -1.01, -1, -0.6, 0, 0.8, 1, 1.01, amplitudeSum]) {
      expect(Number.isFinite(chalk(value))).toBe(true)
      expect(chalk(value)).toBeGreaterThanOrEqual(0)
      expect(chalk(value)).toBeLessThanOrEqual(1)
    }
    for (const value of [-1, -0.5, 0, 0.5, 1]) {
      expect(chalk(value)).toBe((value * 0.5 + 0.5) ** 1.45)
    }
  })
  test('preserves intended cups, glowing polyps and geometric relief', async () => {
    const text = await source()
    expect(text).toContain('const cup = cupDistance.smoothstep(0.045, 0.16).oneMinus()')
    expect(text).toContain('const polypLight = cup.mul(')
    expect(text).toContain('rim.mul(0.0022).add(cup.mul(-0.0008))')
  })
})
