import {describe, expect, test} from 'bun:test'

import AbyssalPulse from 'knot-materials/entries/abyssal_pulse/Material.ts'
import {Texture} from 'three/webgpu'

const source = () => Bun.file(new URL('../../packages/knot-materials/src/entries/abyssal_pulse/Material.ts', import.meta.url)).text()
const period = [6, 5]
const wrap = (value: number, axis: number) => (value % period[axis] + period[axis]) % period[axis]
const feature = (x: number, y: number) => ({
  center: [wrap(x, 0) === 0 ? 0.8 : 0.05, 0.5],
  radius: 0.3,
  gate: wrap(x, 0) === 0 && wrap(y, 1) === 0 ? 1 : 0,
})
const coverage = (x: number, y: number) => {
  const base = [Math.floor(x), Math.floor(y)]
  const local = [x - base[0], y - base[1]]
  let disc = 0
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const organ = feature(base[0] + i, base[1] + j)
      const distance = Math.hypot(i + organ.center[0] - local[0], j + organ.center[1] - local[1])
      disc = Math.max(disc, distance < organ.radius ? organ.gate : 0)
    }
  }
  return disc
}
describe('Abyssal Pulse complete photophores', () => {
  test('retains breathing, wet skin and caller-owned illumination', () => {
    const environment = new Texture
    const material = new AbyssalPulse(environment)
    try {
      expect(material.name).toBe('abyssal_pulse')
      expect(material.envMap).toBe(environment)
      expect(material.positionNode?.isNode).toBe(true)
      expect(material.normalNode?.isNode).toBe(true)
      expect(material.emissiveNode?.isNode).toBe(true)
      expect(material.clearcoat).toBe(0.8)
    } finally {
      material.dispose()
      environment.dispose()
    }
  })
  test('evaluates every organ instead of borrowing distance and attributes from the nearest owner', async () => {
    const text = await source()
    expect(text).not.toContain('voronoi2d')
    expect(text).not.toContain('organs.nearest')
    expect(text).toContain('wrapCell(base.add(offset), period)')
    expect(text).toContain('offset.add(cellNoiseVec3(vec3(cell, 4)).xy)')
    expect(text).toContain('cellNoiseVec3(vec3(cell, 3))')
    expect(text).toContain('photophores = photophores.add(')
    expect(text).toContain('organDisc = organDisc.max(disc.mul(gate))')
    expect(text).toContain('goosebumps = goosebumps.max(dome.mul(disc).mul(gate).mul(0.0025))')
  })
  test('a disabled neighboring organ cannot clip an active circle, including across a cell face', () => {
    // Active center x=0.8; disabled neighbor x=1.05. Its Voronoi ownership starts at x=0.925.
    for (const x of [0.93, 0.99, 1, 1.01, 1.09]) {
      expect(Math.abs(x - 1.05)).toBeLessThan(Math.abs(x - 0.8))
      expect(coverage(x, 0.5)).toBe(1)
    }
    expect(coverage(1.11, 0.5)).toBe(0)
  })
  test('matches both periodic seams and supports circles centered in neighboring cells', () => {
    for (const x of [0.7, 0.93, 1.01]) {
      for (const y of [0.4, 0.5, 0.6]) {
        expect(coverage(x, y)).toBe(coverage(x + period[0], y))
        expect(coverage(x, y)).toBe(coverage(x, y + period[1]))
        expect(coverage(x, y)).toBe(coverage(x - period[0], y - period[1]))
      }
    }
    expect(coverage(1.01, 0.5)).toBe(1)
    expect(coverage(1.01 + period[0], 0.5 + period[1])).toBe(1)
  })
  test('bounds antialiasing and halo support inside the complete 3×3 search', async () => {
    const text = await source()
    expect(text).toContain('radius.add(footprint).min(0.45)')
    expect(text).toContain('distance.smoothstep(0.6, 0.9).oneMinus()')
    expect(text).toContain('lattice.fwidth().length().max(0.001)')
    expect(text).toContain('footprint.smoothstep(0.3, 1).oneMinus()')
    expect(text).toContain('radius = organ.x.mul(0.14).add(0.16)')
    expect(text).toContain('idleWave.add(organ.y.mul(0.15))')
    expect(text).toContain('t.mul(organ.z.mul(3).add(2))')
    // A feature in an omitted cell is at least one lattice unit away, even with full-cell jitter.
    expect(0.45).toBeLessThan(1)
    expect(0.9).toBeLessThan(1)
    for (const footprint of [0.001, 0.1, 0.3, 1, 10]) {
      for (const radius of [0.16, 0.3]) {
        expect(Math.max(radius - footprint, 0)).toBeLessThan(Math.min(radius + footprint, 0.45))
      }
    }
  })
})
