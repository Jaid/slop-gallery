import {describe, expect, test} from 'bun:test'

import MercuryScript from 'knot-materials/entries/mercury_script/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/mercury_script/Material.ts', import.meta.url)).text()
describe('Mercury Script intact lettering', () => {
  test('constructs the inlaid lacquer material', () => {
    const environment = new Texture
    const material = new MercuryScript(environment)
    try {
      expect(material.name).toBe('mercury_script')
      for (const node of [material.colorNode, material.normalNode, material.emissiveNode, material.anisotropyNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.iridescenceIOR).toBe(1.85)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('shifts the complete page before selecting glyph identities', async () => {
    const text = await source()
    expect(text).toContain('const shiftedPage = page.sub(')
    expect(text).toContain('const cell = shiftedPage.floor()')
    expect(text).toContain('const ink = shiftedPage.fract().sub(0.5)')
    expect(text).not.toContain('local.sub(')
  })
  test('contains strokes and cell-specific shading within filtered glyph support', async () => {
    const text = await source()
    expect(text).toContain('const footprint = shiftedPage.fwidth().length()')
    expect(text).toContain('field.smoothstep(aa.negate(), aa).oneMinus()')
    expect(text).toContain('ink.x.abs().max(ink.y.abs()).smoothstep(0.43, 0.49).oneMinus()')
    expect(text).toContain('max(dot).mul(glyphSupport)')
    expect(text).toContain('vec2(lean.mul(glyph), 1)')
    expect(text).not.toContain('screenFill(ink.x.abs().sub(0.36)).oneMinus()')
    expect(text).toContain(".add(color('#9eb4cc').mul(dot).mul(0.3)).mul(glyphSupport)")
    // Glyph support vanishes before a cell identity can change.
    expect(0.49).toBeLessThan(0.5)
  })
})
