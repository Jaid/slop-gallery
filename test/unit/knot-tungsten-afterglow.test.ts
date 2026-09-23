import {describe, expect, test} from 'bun:test'

import TungstenAfterglow from 'knot-materials/entries/tungsten_afterglow/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/tungsten_afterglow/Material.ts', import.meta.url)).text()
describe('Tungsten Afterglow seamless coil', () => {
  test('constructs the heated metal material', () => {
    const environment = new Texture
    const material = new TungstenAfterglow(environment)
    try {
      expect(material.name).toBe('tungsten_afterglow')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.roughnessNode, material.metalnessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.envMapIntensity).toBe(0.55)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes the coil without changing the five-cycle heating animation', async () => {
    const text = await source()
    expect(text).toContain('opticalBands(tube.x.mul(TAU * 27).add(tube.y.mul(TAU)))')
    expect(text).not.toContain('tube.x.mul(168)')
    expect(text).toContain('tube.x.mul(Math.PI * 10).add(time.mul(0.62))')
    expect(text).toContain('proceduralNormal(coil.mul(0.45)')
  })
  test('matches the coil value and slope at both wraps', () => {
    for (const phase of [0, 0.3, 2.7, -6.4]) {
      for (const cycles of [1, 27]) {
        const wrapped = phase + Math.PI * 2 * cycles
        expect(Math.cos(wrapped)).toBeCloseTo(Math.cos(phase), 12)
        expect(Math.sin(wrapped)).toBeCloseTo(Math.sin(phase), 12)
      }
    }
  })
})
