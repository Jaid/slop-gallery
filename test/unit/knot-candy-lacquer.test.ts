import {describe, expect, test} from 'bun:test'

import CandyLacquer from 'knot-materials/entries/candy_lacquer/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/candy_lacquer/Material.ts', import.meta.url)).text()
describe('Candy Lacquer layers', () => {
  test('constructs the polished, displaced lacquer', () => {
    const environment = new Texture
    const material = new CandyLacquer(environment)
    try {
      expect(material.name).toBe('candy_lacquer')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoatNormalNode).toBe(material.normalNode)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('preserves intentional blocks and parallax but confines filtering to each owning cell', async () => {
    const text = await source()
    expect(text).toContain('outerLocal.x.abs().max(outerLocal.y.abs()).max(outerLocal.z.abs())')
    expect(text).toContain('innerLocal.x.abs().max(innerLocal.y.abs()).max(innerLocal.z.abs())')
    expect(text).toContain('p.sub(view.mul(0.095)).mul(4.65)')
    expect(text).toContain('outerCoordinate.fwidth().length()')
    expect(text).toContain('innerCoordinate.fwidth().length()')
    expect(text).not.toContain('outerEdge.fwidth()')
    expect(text).not.toContain('innerEdge.fwidth()')
    expect(text).toContain('outerEdge.smoothstep(0.33, outerFilter.add(0.39).min(0.49))')
    expect(text).toContain('innerEdge.smoothstep(0.4, innerFilter.add(0.45).min(0.49))')
    for (const filter of [0, 0.01, 0.1, 1, 10]) {
      expect(Math.min(0.39 + filter, 0.49)).toBeGreaterThan(0.33)
      expect(Math.min(0.45 + filter, 0.49)).toBeGreaterThan(0.4)
      expect(Math.min(0.45 + filter, 0.49)).toBeLessThan(0.5)
    }
  })
  test('never illuminates the lower layer with an unsupported outer-cell tint', async () => {
    const text = await source()
    expect(text).toContain('mix(outerTint, innerTint, innerPane.mul(0.44))')
    expect(text).toContain('mix(blackGlass, paneColor, outerPane.mul(0.94))')
    expect(text).toContain('paneColor.mul(outerPane.mul(0.82)).add(innerTint.mul(innerPane.mul(0.18)))')
    expect(text).not.toContain('paneColor.mul(outerPane.mul(0.82).add(innerPane.mul(0.18)))')
    expect(text).toContain('const outerPaneRaw = outerEdge.smoothstep(0.33, 0.39).oneMinus()')
    expect(text).toContain('normalLocal.mul(leadRaw.mul(0.009).sub(outerPaneRaw.mul(0.0018)))')
  })
})
