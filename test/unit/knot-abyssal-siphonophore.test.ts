import {describe, expect, test} from 'bun:test'

import AbyssalSiphonophore from 'knot-materials/entries/abyssal_siphonophore/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abyssal_siphonophore/Material.ts', import.meta.url)).text()
describe('Abyssal Siphonophore periodic waves', () => {
  test('preserves the translucent body and internal light', () => {
    const environment = new Texture
    const material = new AbyssalSiphonophore(environment)
    try {
      expect(material.name).toBe('abyssal_siphonophore')
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.transmission).toBe(0.93)
      expect(material.ior).toBe(1.334)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('uses whole cycles for defensive waves, tint, cilia and their independent rainbow', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU * 15).sub(time.mul(4.2))')
    expect(text).toContain('const rainbowPhase = tube.x.mul(TAU)')
    expect(text).not.toContain('ciliaPhase.mul(0.06)')
    expect(text).toContain('tube.x.mul(TAU * 3).sub(time.mul(2.2)).sin()')
    expect(text).toContain('tube.x.mul(TAU).sin().mul(0.5).add(0.5)')
    for (const cycles of [1, 3, 15]) {
      for (const phase of [0, 0.27, 3.4, 87]) {
        expect(Math.sin(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.sin(phase), 12)
        expect(Math.cos(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.cos(phase), 12)
      }
    }
  })
  test('keeps the eight comb rows masked with an ordered smoothstep', async () => {
    const text = await source()
    expect(text).toContain('const combY = tube.y.mul(8)')
    expect(text).toContain('combDist.smoothstep(0.02, combFootprint.mul(1.2).add(0.06)).oneMinus()')
    expect(text).toContain('const combRidge = inRow.mul(')
    expect(text).toContain('const combEmission = diffraction.mul(inRow)')
  })
})
