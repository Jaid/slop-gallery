import {describe, expect, test} from 'bun:test'

import VelvetNocturne from 'knot-materials/entries/velvet_nocturne/Material.ts'
import {Texture} from 'three/webgpu'

const coordinate = (u: number, v: number, along: number, around: number) => {
  const a = u * Math.PI * 2
  const b = v * Math.PI * 2
  return [Math.cos(a) * along, Math.sin(a) * along + Math.cos(b) * around, Math.sin(b) * around].map(x => x / (Math.PI * 2))
}
const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/velvet_nocturne/Material.ts', import.meta.url)).text()
describe('Velvet Nocturne seamless cloth', () => {
  test('preserves displaced folds, sheen and embroidery', () => {
    const environment = new Texture
    const material = new VelvetNocturne(environment)
    try {
      expect(material.name).toBe('velvet_nocturne')
      for (const node of [material.positionNode, material.normalNode, material.sheenNode, material.metalnessNode, material.emissiveNode]) {
        expect(node?.isNode).toBe(true)
      }
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('matches textile coordinates on both UV wraps even with fractional noise scales', () => {
    for (const [along, around] of [[17, 5], [3.4, 2.1], [7, 3], [220, 20], [900, 60]]) {
      for (const t of [0, 0.27, 0.81, 1]) {
        for (let axis = 0; axis < 3; axis++) {
          expect(coordinate(0, t, along, around)[axis]).toBeCloseTo(coordinate(1, t, along, around)[axis], 10)
          expect(coordinate(t, 0, along, around)[axis]).toBeCloseTo(coordinate(t, 1, along, around)[axis], 10)
        }
      }
    }
  })
  test('uses periodic coordinates for every noise layer and filters fragment-only pile detail', async () => {
    const text = await source()
    for (const scales of ['17, 5', '3.4, 2.1', '7, 3', '220, 20', '900, 60']) {
      expect(text).toContain(`clothCoordinate(u, v, ${scales})`)
    }
    expect(text).not.toContain('mx_noise_float(u.')
    expect(text).not.toContain('mx_noise_vec3(u.')
    expect(text).toContain('angle.fwidth().smoothstep(0.6, 3).oneMinus()')
    expect(text).toContain('weave(u, v, time, pileHarmonics, true)')
    expect(text).toContain('weave(u, v, time, drapeHarmonics)')
    expect(text).toContain('weave(u, v, time, wrinkleHarmonics)')
    expect(text).toContain('glints(lintNormal, 120).mul(lintVisibility)')
  })
})
