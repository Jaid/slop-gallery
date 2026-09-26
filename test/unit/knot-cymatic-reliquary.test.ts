import {describe, expect, test} from 'bun:test'

import CymaticReliquary from 'knot-materials/entries/cymatic_reliquary/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/cymatic_reliquary/Material.ts', import.meta.url)).text()
const wave = (u: number, v: number, warp: number, time: number) => {
  const tau = Math.PI * 2
  return Math.sin(u * tau * 16 + v * tau + warp * 1.4 + time * 0.11)
    + Math.sin(u * tau * 26 - v * tau - warp * 0.9 - time * 0.083) * 0.72
    + Math.sin(u * tau * 41 + v * tau * 3 + warp * 0.65 + time * 0.047) * 0.38
}
describe('Cymatic Reliquary closed porcelain', () => {
  test('constructs displaced porcelain with separate glaze detail', () => {
    const environment = new Texture
    const material = new CymaticReliquary(environment)
    try {
      expect(material.name).toBe('cymatic_reliquary')
      for (const node of [material.positionNode, material.normalNode, material.clearcoatNormalNode, material.colorNode]) {
        expect(node?.isNode).toBe(true)
      }
      expect(material.clearcoat).toBe(1)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('shares periodic harmonics and closed noise coordinates between geometry and decoration', async () => {
    const text = await source()
    expect(text).toContain('standingWave(tube, warp, slow)')
    expect(text).toContain('standingWave(fieldP, warp, time)')
    expect(text).toContain('q.x.mul(TAU * 16).add(q.y.mul(TAU))')
    expect(text).toContain('q.x.mul(TAU * 26).sub(q.y.mul(TAU))')
    expect(text).toContain('q.x.mul(TAU * 41).add(q.y.mul(TAU * 3))')
    expect(text).toContain('knotFrame(tube).position.mul(vec3(4.4, 3.1, 4.4))')
    expect(text).toContain('knotFrame(fieldP).position.mul(17).add(warp.mul(1.2))')
    expect(text).not.toContain('TAU * 2.35')
    expect(text).not.toContain('vec3(tube.x.mul(4.4)')
    expect(text).toContain('standing.mul(0.0028).add(warp.mul(0.0007))')
  })
  test('matches wave heights and finite-difference slopes on both UV wraps', () => {
    const epsilon = 0.0001
    for (const time of [0, 1.7, 100]) {
      for (const warp of [-1, 0.3, 1]) {
        for (const t of [0, 0.23, 0.81]) {
          expect(wave(0, t, warp, time)).toBeCloseTo(wave(1, t, warp, time), 11)
          expect(wave(t, 0, warp, time)).toBeCloseTo(wave(t, 1, warp, time), 11)
          const slopeU0 = (wave(epsilon, t, warp, time) - wave(-epsilon, t, warp, time)) / (2 * epsilon)
          const slopeU1 = (wave(1 + epsilon, t, warp, time) - wave(1 - epsilon, t, warp, time)) / (2 * epsilon)
          const slopeV0 = (wave(t, epsilon, warp, time) - wave(t, -epsilon, warp, time)) / (2 * epsilon)
          const slopeV1 = (wave(t, 1 + epsilon, warp, time) - wave(t, 1 - epsilon, warp, time)) / (2 * epsilon)
          expect(slopeU0).toBeCloseTo(slopeU1, 7)
          expect(slopeV0).toBeCloseTo(slopeV1, 7)
        }
      }
    }
  })
})
