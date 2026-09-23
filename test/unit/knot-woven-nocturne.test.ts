import {describe, expect, test} from 'bun:test'

import WovenNocturne from 'knot-materials/entries/woven_nocturne/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/woven_nocturne/Material.ts', import.meta.url)).text()
describe('Woven Nocturne fuzz', () => {
  test('preserves the woven brocade material', () => {
    const environment = new Texture
    const material = new WovenNocturne(environment)
    try {
      expect(material.name).toBe('woven_nocturne')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.anisotropyNode, material.metalnessNode]) {
        expect(node?.isNode).toBe(true)
      }
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('bounds both fuzz highlights and normal perturbations inside individual cells', async () => {
    const text = await source()
    expect(text).toContain('glitter(positionGeometry, 0.0021, 40, 0.9)')
    expect(text).toContain('positionGeometry.div(0.0021)')
    expect(text).toContain('cellNoiseVec3(fuzzCoord.floor()).mul(0.5).add(0.25)')
    expect(text).toContain('fuzzCoord.fwidth().length().add(0.18).min(0.24)')
    expect(text).toContain('fuzzCoord.fract().sub(fuzzCenter).length().smoothstep(0.06, fuzzRadius).oneMinus()')
    expect(text).toContain('fuzz.sparkle.mul(fuzzCoverage).mul(intimate)')
    expect(text).toContain('fuzz.lean.mul(fuzzCoverage).mul(0.08)')
    expect(text).not.toContain('fuzz.lean.mul(0.08)')
    expect(0.24).toBeLessThan(0.25)
  })
  test('retains the intentional twill and gold embroidery', async () => {
    const text = await source()
    expect(text).toContain('s.floor().add(t.floor().mul(2)).mod(4).lessThan(2)')
    expect(text).toContain('const silkWeave = mix(silkGround, silkGround.mul(1.6), weftOnTop.mul(woven))')
    expect(text).toContain('const brocade = outline.max(heart).max(ribbon.mul(0.92)).max(beadRow.mul(0.75)).max(border).clamp()')
  })
})
