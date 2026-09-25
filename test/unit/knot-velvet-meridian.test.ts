import {describe, expect, test} from 'bun:test'

import VelvetMeridian from 'knot-materials/entries/velvet_meridian/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/velvet_meridian/Material.ts', import.meta.url)).text()
const coordinate = (u: number, v: number, along: number, around: number) => {
  const a = u * Math.PI * 2
  const b = v * Math.PI * 2
  return [Math.cos(a) * along, Math.sin(a) * along + Math.cos(b) * around, Math.sin(b) * around].map(x => x / (Math.PI * 2))
}
describe('Velvet Meridian closed cloth', () => {
  test('constructs displaced velvet with its weave and sheen', () => {
    const environment = new Texture
    const material = new VelvetMeridian(environment)
    try {
      expect(material.name).toBe('velvet_meridian')
      for (const node of [material.positionNode, material.normalNode, material.colorNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.sheen).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('closes noise coordinates at both edges for coarse folds and fine fibres', () => {
    for (const [along, around] of [[5.2, 2.1], [620, 82]]) {
      for (const t of [0, 0.23, 0.81, 1]) {
        for (let axis = 0; axis < 3; axis++) {
          expect(coordinate(0, t, along, around)[axis]).toBeCloseTo(coordinate(1, t, along, around)[axis], 10)
          expect(coordinate(t, 0, along, around)[axis]).toBeCloseTo(coordinate(t, 1, along, around)[axis], 10)
        }
      }
    }
  })
  test('uses periodic displacement and shades detail around its displaced normal', async () => {
    const text = await source()
    expect(text).toContain('textileCoordinate(tube, 5.2, 2.1)')
    expect(text).toContain('tube.x.mul(TAU * 18)')
    expect(text).toContain('tube.y.mul(TAU).sin().mul(0.55)')
    expect(text).toContain('textileCoordinate(tube, 620, 82)')
    expect(text).toContain('detailNormal(displacedNormal, weave.mul(0.00075)')
    expect(text).not.toContain('proceduralNormal(')
    expect(text).not.toContain('moirePhase.mul(1.071)')
    expect(text).not.toContain('moirePhase.mul(0.11)')
    expect(text).toContain('warp.sin().mul(weft.sin()).smoothstep(-0.12, 0.12)')
    expect(text).toContain('mix(float(0.5), fiber, fiberResolved)')
  })
})
