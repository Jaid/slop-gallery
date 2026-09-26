import {describe, expect, test} from 'bun:test'

import CloisonneKingdoms from 'knot-materials/entries/cloisonne_kingdoms/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/cloisonne_kingdoms/Material.ts', import.meta.url)).text()
describe('Cloisonné Kingdoms enamel flecks', () => {
  test('preserves the glazed enamel material', () => {
    const environment = new Texture
    const material = new CloisonneKingdoms(environment)
    try {
      expect(material.name).toBe('cloisonne_kingdoms')
      for (const node of [material.colorNode, material.normalNode, material.roughnessNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
      expect(material.clearcoat).toBe(0.98)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('confines every cell-dependent effect to filtered inclusions', async () => {
    const text = await source()
    expect(text).toContain('const fleckPosition = p.mul(24)')
    expect(text).toContain('fleckRandom.mul(0.5).add(0.25)')
    expect(text).toContain('fleckFootprint.add(0.18).min(0.24)')
    expect(text).toContain('fleckPosition.fract().sub(fleckCenter).length().smoothstep(0.06, fleckRadius).oneMinus()')
    expect(text).toContain('fleckFootprint.smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('const fleck = fleckRandom.z.mul(fleckMask)')
    expect(text).toContain('fleckRandom.z.smoothstep(0.8, 0.95).mul(fleckMask)')
    expect(text).toContain('add(fleck.mul(near).mul(0.014))')
    expect(text).toContain('sub(fleck.mul(near).mul(0.025))')
    for (const center of [0.25, 0.5, 0.75]) {
      expect(center - 0.24).toBeGreaterThan(0)
      expect(center + 0.24).toBeLessThan(1)
    }
  })
  test('retains the gold-wire boundaries and enamel palette', async () => {
    const text = await source()
    expect(text).toContain('const edge = cells.y.sub(cells.x)')
    expect(text).toContain('edge.abs().smoothstep(0.015, 0.045).oneMinus()')
    expect(text).toContain("mix(jewel2, color('#d98b27'), enamelField.smoothstep(0.78, 0.96))")
  })
})
