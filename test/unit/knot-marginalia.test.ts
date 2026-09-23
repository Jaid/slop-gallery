import {describe, expect, test} from 'bun:test'

import Marginalia from 'knot-materials/entries/marginalia/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/marginalia/Material.ts', import.meta.url)).text()
describe('Marginalia lettering', () => {
  test('constructs parchment with metallic illumination and animated writing', () => {
    const environment = new Texture
    const material = new Marginalia(environment)
    try {
      expect(material.name).toBe('marginalia')
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.metalnessNode?.isNode).toBe(true)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('keeps complete glyphs inside their cells with bounded filtering', async () => {
    const text = await source()
    expect(text).toContain('const box = vec2(inColumn, inRow)')
    expect(text).toContain('vec2(0.5, 0.1), vec2(0.5, 0.9)')
    expect(text.split('clamp(0.12, 0.88)')).toHaveLength(3)
    expect(text).toContain('vec2(column, row).fwidth().length()')
    expect(text).toContain('footprint.min(0.025).max(0.0009)')
    expect(text).not.toContain('stroke.fwidth()')
    expect(text).toContain('const ink = inkCoverage.mul(resolved)')
    expect(0.032 + 0.01 + 0.025).toBeLessThan(0.1)
    expect(0.39 * 0.85 + 0.032 + 0.01 + 0.025).toBeLessThan(0.5)
  })
  test('gilds initials and inset borders rather than entire random cells', async () => {
    const text = await source()
    expect(text).toContain('.smoothstep(0.965, 0.98).mul(ink)')
    expect(text).toContain('box.sub(0.5).abs().div(vec2(0.42, 0.4))')
    expect(text).toContain('panelEdge.smoothstep(0.76, 0.84).mul(panelEdge.smoothstep(0.92, 1).oneMinus())')
    expect(text).toContain('const carpetGold = carpet.mul(border).mul(resolved)')
    expect(text).toContain('inRow.smoothstep(0.95, 0.98).oneMinus()')
    expect(text).toContain('mix(lit, inkTone, ink.mul(written).mul(0.94))')
    expect(text).toContain('const tail = loopTurn.sub(page.x).fract()')
  })
  test('filters continuous object-space paper fibers and excludes raw coverage from bump shading', async () => {
    const text = await source()
    expect(text).toContain('point.fwidth().length().smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('mix(float(0.5), mx_noise_float(point).mul(0.5).add(0.5), visibility)')
    expect(text).toContain('paperGrain(p.mul(vec3(180, 26, 26)))')
    expect(text).toContain('paperGrain(p.mul(vec3(430, 17, 17)).add(3.3))')
    expect(text).toContain('proceduralNormal(ink.mul(0.05)')
    expect(text).not.toContain('proceduralNormal(inkCoverage')
  })
})
