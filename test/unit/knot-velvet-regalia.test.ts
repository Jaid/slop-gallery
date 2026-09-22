import {describe, expect, test} from 'bun:test'

import VelvetRegalia from 'knot-materials/entries/velvet_regalia/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/velvet_regalia/Material.ts', import.meta.url)).text()
const phase = (u: number, v: number) => {
  const along = u * Math.PI * 2
  const coordinate = v + Math.sin(along) * 0.34 + Math.cos(along * 2) * 0.14
  const cord = coordinate - Math.floor(coordinate) - 0.5
  return {
    cord,
    ply: Math.sin(cord * 24 + along * 11),
  }
}
describe('Velvet Regalia fabric', () => {
  test('constructs the velvet and anisotropic gold cord', () => {
    const environment = new Texture
    const material = new VelvetRegalia(environment)
    try {
      expect(material.name).toBe('velvet_regalia')
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.anisotropyNode?.isNode).toBe(true)
      expect(material.sheenNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(0)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes the wandering cord, plies and stitches over both UV seams', async () => {
    const text = await source()
    expect(text).toContain('const cord = thread(tube)')
    expect(text).toContain('const alongPhase = tile.x.mul(Math.PI * 2)')
    expect(text).toContain('alongPhase.sin().mul(0.34).add(alongPhase.mul(2).cos().mul(0.14))')
    expect(text).toContain('tile.y.add(wander).fract().sub(0.5)')
    expect(text).toContain('cord.mul(24).add(alongPhase.mul(11))')
    expect(text).toContain('const stitchPhase = tile.x.mul(20)')
    expect(text).toContain('along: vec2(1, slope.negate()).normalize()')
    expect(text).not.toContain('mx_atan2')
    for (const t of [0, 0.13, 0.4, 0.8, 1]) {
      expect(phase(0, t).cord).toBeCloseTo(phase(1, t).cord, 10)
      expect(phase(0, t).ply).toBeCloseTo(phase(1, t).ply, 10)
      expect(phase(t, 0).cord).toBeCloseTo(phase(t, 1).cord, 10)
      expect(phase(t, 0).ply).toBeCloseTo(phase(t, 1).ply, 10)
    }
  })
  test('filters fibers and stitches while keeping derivatives out of vertex relief', async () => {
    const text = await source()
    expect(text).toContain('p.mul(96).fwidth().length().smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('p.mul(260).fwidth().length().smoothstep(0.25, 1).oneMinus()')
    expect(text).toContain('mix(float(0.5), nap, napVisibility)')
    expect(text).toContain('mix(float(0.33), rawStitch, stitchVisibility)')
    expect(text).toContain('const pileHeight = pile.mul(0.04).add(cord.rawBody.mul(1.2)).sub(cord.rawDent.mul(0.55))')
    expect(text).toContain('normalLocal.mul(pileHeight.mul(0.005))')
    expect(text).toContain('proceduralNormal(surfaceHeight.mul(0.005), 1)')
    expect(text).not.toContain('glints(normalLocal')
    expect(text).toContain('.mul(napVisibility).mul(near)')
  })
})
