import {describe, expect, test} from 'bun:test'

import PolarOpal from 'knot-materials/entries/polar_opal/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/polar_opal/Material.ts', import.meta.url)).text()
describe('Polar Opal crystal transitions', () => {
  test('constructs the iridescent opal material', () => {
    const environment = new Texture
    const material = new PolarOpal(environment)
    try {
      expect(material.name).toBe('polar_opal')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.iridescenceThicknessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.iridescence).toBe(1)
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('joins crystal identities continuously before using them for relief', async () => {
    const text = await source()
    expect(text).toContain('mx_worley_noise_float(crystalPosition, 1, 1)')
    expect(text).toContain('cellularBoundary(crystalPosition).smoothstep(0, crystalPosition.fwidth().length().add(0.18))')
    expect(text).toContain('const harlequin = mix(float(0.5), crystalRandom, crystalInterior)')
    expect(text).toContain('proceduralNormal(potch.mul(0.45).add(harlequin.mul(0.2)), 0.0035)')
    expect(text).not.toContain('mx_cell_noise_float(p.mul(7)')
  })
  test('avoids sawtooth resets between the mint and pink colors', async () => {
    const text = await source()
    expect(text).toContain("mix(color('#7cffd4'), color('#ff6ad4'), hueC.sin().mul(0.5).add(0.5))")
    expect(text).not.toContain('hueC.fract()')
    expect(text).toContain('const fireMask = potch.smoothstep(0.02, 0.42)')
  })
})
