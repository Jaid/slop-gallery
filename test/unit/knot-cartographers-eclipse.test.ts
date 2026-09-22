import {describe, expect, test} from 'bun:test'

import CartographersEclipse from 'knot-materials/entries/cartographers_eclipse/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/cartographers_eclipse/Material.ts', import.meta.url)).text()
describe('Cartographer constellation', () => {
  test('constructs the dark metallic star map', () => {
    const environment = new Texture
    const material = new CartographersEclipse(environment)
    try {
      expect(material.name).toBe('cartographers_eclipse')
      expect(material.colorNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.metalness).toBe(0.55)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('evaluates complete stars and finite neighbor links instead of inverted cell-wide fields', async () => {
    const text = await source()
    expect(text).toContain('loop(27, ({i}) =>')
    expect(text).toContain('const identity = cell.add(offset)')
    expect(text).toContain('offset.add(random.mul(0.5).add(0.25))')
    expect(text).toContain('cellNoiseVec3(identity.add(direction))')
    expect(text).toContain('offset.add(direction).add(neighbor.mul(0.5).add(0.25))')
    expect(text).toContain('relative.dot(segment).div(segment.dot(segment).max(0.0001)).clamp()')
    expect(text).toContain('relative.sub(segment.mul(along)).length()')
    expect(text).not.toContain('cellSum')
    expect(text).not.toContain('linkPhase')
    expect(text).toContain('stars.addAssign(')
    expect(text).toContain('links.addAssign(')
  })
  test('bounds filtered support within the evaluated neighborhood and preserves twinkle and parallax', async () => {
    const text = await source()
    expect(text).toContain('const footprint = q.fwidth().length().max(0.001)')
    expect(text).toContain('const filter = footprint.min(0.08)')
    expect(text).toContain('random.z.mul(0.055).add(0.035)')
    expect(text).toContain('smoothstep(radius.sub(filter).max(0), radius.add(filter)).oneMinus()')
    expect(text).toContain('distance.smoothstep(0.008, filter.add(0.018)).oneMinus()')
    // Sites lie in [0.25, 0.75]. An omitted cell's forward link ends at most at -0.25.
    expect(0.035 + 0.055 + 0.08).toBeLessThan(0.25)
    expect(0.018 + 0.08).toBeLessThan(0.25)
    expect(text).toContain('footprint.smoothstep(0.2, 0.8).oneMinus()')
    expect(text).toContain('time.mul(random.x.mul(8).add(1))')
    expect(text).toContain('const starField = constellation(p.mul(13))')
    expect(text).toContain('p.add(viewDir.mul(0.04)).add(drift)')
    expect(text).toContain('p.add(viewDir.mul(-0.08)).add(drift.mul(0.6))')
    expect(text).toContain("const deep = color('#02030a')")
  })
})
