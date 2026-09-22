import {describe, expect, test} from 'bun:test'

import Asteria from 'knot-materials/entries/asteria/Material.ts'
import Gossamer from 'knot-materials/entries/gossamer/Material.ts'
import Quicksilver from 'knot-materials/entries/quicksilver/Material.ts'
import Vitrail from 'knot-materials/entries/vitrail/Material.ts'
import {Texture} from 'three/webgpu'

const source = (path: string) => Bun.file(new URL(`../../packages/knot-materials/src/${path}`, import.meta.url)).text()
describe('Gossamer and shared dew coverage', () => {
  test('constructs every consumer of the corrected bead mask', () => {
    const environment = new Texture
    try {
      for (const Material of [Asteria, Gossamer, Quicksilver, Vitrail]) {
        const material = new Material(environment)
        try {
          expect(material.normalNode?.isNode).toBe(true)
          expect(material.positionNode?.isNode).toBe(true)
          expect(material.emissiveNode?.isNode).toBe(true)
        } finally {
          material.dispose()
        }
      }
    } finally {
      environment.dispose()
    }
  })
  test('keeps filtered beads inside their cells and fills their interiors rather than their exteriors', async () => {
    const text = await source('lib/beads.ts')
    expect(text).toContain('random.mul(0.5).add(0.25)')
    expect(text).toContain('const inner = radius.sub(footprint.mul(1.2)).max(0)')
    expect(text).toContain('const outer = radius.add(footprint.mul(1.2)).min(0.24)')
    expect(text).toContain('dist.smoothstep(inner, outer).oneMinus().mul(gate)')
    expect(text).toContain('radius.div(outer).pow2()')
    expect(text).toContain('footprint.smoothstep(0.25, 1).oneMinus()')
    for (const radius of [0.09, 0.145, 0.2]) {
      for (const footprint of [0.001, 0.03, 0.2, 1, 10]) {
        const inner = Math.max(0, radius - footprint * 1.2)
        const outer = Math.min(0.24, radius + footprint * 1.2)
        expect(inner).toBeLessThan(outer)
        expect(outer).toBeLessThan(0.25)
        const coverage = (distance: number) => {
          const t = Math.max(0, Math.min(1, (distance - inner) / (outer - inner)))
          return 1 - t * t * (3 - 2 * t)
        }
        expect(coverage(0)).toBe(1)
        expect(coverage(0.25)).toBe(0)
      }
    }
  })
  test('filters periodic strands and confines random motion to droplets', async () => {
    const text = await source('entries/gossamer/Material.ts')
    expect(text).toContain('vec2(along.cos(), along.sin())')
    expect(text).toContain('threads.mul(Math.PI * 2).sin()')
    expect(text).toContain('mask: mix(float(2 / 3), cord, fine)')
    expect(text).toContain('sheen: mix(float(0.5), twist, fine)')
    expect(text).toContain('thread.rawSheen.mul(thread.cord)')
    expect(text).toContain('.mul(intimate).mul(heavy.core).mul(0.35)')
    expect(text).toContain('.mul(intimate).mul(heavy.mask).mul(0.35)')
    expect(text).toContain('proceduralNormal(filteredHeight.mul(0.004).add(filteredWobble.mul(0.0002)), 1)')
    expect(text).toContain('glints(normalViewGeometry, 60).mul(thread.mask)')
    expect(text).not.toContain('heavy.random.x')
    expect(text).not.toContain('heavy.random.y')
    expect(text.slice(text.indexOf('const silkColor'))).not.toContain('thread.cord')
  })
})
