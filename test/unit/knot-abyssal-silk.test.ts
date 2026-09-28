import {describe, expect, test} from 'bun:test'

import AbyssalSilk from 'knot-materials/entries/abyssal_silk/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abyssal_silk/Material.ts', import.meta.url)).text()
describe('Abyssal Silk seamless threads', () => {
  test('preserves the iridescent silk material', () => {
    const environment = new Texture
    const material = new AbyssalSilk(environment)
    try {
      expect(material.name).toBe('abyssal_silk')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.roughnessNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.sheen).toBe(0.92)
      expect(material.ior).toBe(1.46)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes both thread phases while retaining the organic warp', async () => {
    const text = await source()
    expect(text).toContain('tube.x.mul(TAU * 99).add(tube.y.mul(TAU * 6)).add(broad.mul(9))')
    expect(text).toContain('tube.x.mul(TAU * 148).sub(tube.y.mul(TAU * 10)).add(counter.mul(12))')
    for (const cycles of [99, 6, 148, -10]) {
      for (const phase of [-3.1, 0, 0.7, 8.4]) {
        expect(Math.sin(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.sin(phase), 10)
        expect(Math.cos(phase + Math.PI * 2 * cycles)).toBeCloseTo(Math.cos(phase), 10)
      }
    }
  })
  test('filters continuous phases instead of already aliased sine values', async () => {
    const text = await source()
    expect(text).toContain('threadPhase.sin().mul(threadPhase.fwidth().smoothstep(0.6, 3).oneMinus())')
    expect(text).toContain('threadPhaseTwo.sin().mul(threadPhaseTwo.fwidth().smoothstep(0.6, 3).oneMinus())')
    expect(text).not.toContain('add(broad.mul(9)).sin()')
    expect(text).not.toContain('add(counter.mul(12)).sin()')
  })
})
