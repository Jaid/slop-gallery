import {describe, expect, test} from 'bun:test'

import NocturneGlass from 'knot-materials/entries/nocturne_glass/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/nocturne_glass/Material.ts', import.meta.url)).text()
describe('Nocturne Glass complete bokeh', () => {
  test('constructs the wet glass and luminous city', () => {
    const environment = new Texture
    const material = new NocturneGlass(environment)
    try {
      expect(material.name).toBe('nocturne_glass')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.ior).toBe(1.5)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('includes neighboring discs at their original sizes with bounded filtering', async () => {
    const text = await source()
    expect(text).toContain('loop(27, ({i}) =>')
    expect(text).toContain('const site = cell.add(neighbor)')
    expect(text).toContain('identity.mul(0.55).add(0.22)')
    expect(text).toContain('identity.z.mul(0.22).add(0.16)')
    expect(text).toContain('local.sub(neighbor.add(centre))')
    expect(text).toContain('const aa = footprint.div(radius).min(0.2)')
    expect(text).not.toContain('smoothstep(1.02, 0.86)')
    // The closest omitted site is at least 1.22 cells away; even the largest filtered disc cannot reach it.
    expect((0.22 + 0.16) * (1.02 + 0.2)).toBeLessThan(1.22)
    expect(text).toContain('bokeh(sheet, 5.6, 0)')
    expect(text).toContain('15, 3.3)')
  })
  test('weights tints by their own light coverage instead of unrelated cell identities', async () => {
    const text = await source()
    expect(text).toContain('coverage.addAssign(vec3(disc, disc.mul(tint.z), disc.mul(tint.x.smoothstep(0.45, 0.9))))')
    expect(text).toContain('lamps.mul(far.disc).mul(0.5).add(nearLamps.mul(nearer.disc).mul(0.24))')
    expect(text).not.toContain('lamps.mul(glow)')
    expect(text).not.toContain('nearLamps.mul(glow)')
    expect(text).toContain("mix(glowColor, color('#eaf2ff').mul(glow), 0.3)")
  })
})
