import {describe, expect, test} from 'bun:test'

import {Vector3} from 'three/webgpu'

import CarvedProfileGeometry, {carvedProfilePoint} from '../../src/lib/gallery/fountain/CarvedProfileGeometry.ts'
import FountainGeometry from '../../src/lib/gallery/fountain/FountainGeometry.ts'

const closedProfile = [[0, 1], [0.8, 1], [1, 0.9], [1, 0.1], [0.9, 0], [0, 0]] as const
describe('fountain carving', () => {
  test('analytic normals agree with the carved surface, including raised spill banks', () => {
    const rim = {
      height: 0.9,
      rise: 0.03,
    }
    const geometry = new CarvedProfileGeometry(closedProfile, 96, 12, 0.045, rim)
    const p = geometry.getAttribute('position')
    const n = geometry.getAttribute('normal')
    const index = geometry.index!
    const a = new Vector3
    const b = new Vector3
    const c = new Vector3
    const shading = new Vector3
    try {
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(p, index.getX(i))
        b.fromBufferAttribute(p, index.getX(i + 1)).sub(a)
        c.fromBufferAttribute(p, index.getX(i + 2)).sub(a)
        const face = b.cross(c).normalize()
        shading.set(0, 0, 0)
        for (let j = 0; j < 3; j++) {
          shading.add(a.fromBufferAttribute(n, index.getX(i + j)))
        }
        expect(face.dot(shading.normalize())).toBeGreaterThan(0.7)
      }
      const low = carvedProfilePoint([1, 0.9], 0, 12, 0.045, rim)
      const bank = carvedProfilePoint([1, 0.9], Math.PI / 12, 12, 0.045, rim)
      expect(low[0]).toBeCloseTo(1.045)
      expect(low[1]).toBeCloseTo(0.9)
      expect(bank[0]).toBeCloseTo(0.955)
      expect(bank[1]).toBeCloseTo(0.93)
    } finally {
      geometry.dispose()
    }
  })
  test('all carved stone components are closed after position welding, without degenerate axis triangles', () => {
    const geometry = new FountainGeometry
    try {
      for (const part of [geometry.stone, geometry.brass]) {
        const position = part.getAttribute('position')
        const indices = part.index!
        const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map(value => Math.round(value * 100_000)).join(':')
        const edges = new Map<string, number>
        for (let i = 0; i < indices.count; i += 3) {
          const corners = [0, 1, 2].map(j => key(indices.getX(i + j)))
          const distinct = new Set(corners)
          expect(distinct.size).toBe(3)
          for (let edge = 0; edge < 3; edge++) {
            const id = [corners[edge], corners[(edge + 1) % 3]].toSorted().join('|')
            edges.set(id, (edges.get(id) ?? 0) + 1)
          }
        }
        expect(edges.values().every(uses => uses === 2)).toBe(true)
      }
    } finally {
      geometry.dispose()
    }
  })
  test('invalid carving parameters are rejected', () => {
    for (const flutes of [0, -2, 1.5, Number.NaN]) {
      expect(() => new CarvedProfileGeometry(closedProfile, 32, flutes, 0.05)).toThrow(RangeError)
    }
    for (const depth of [-0.1, 1, Infinity, Number.NaN]) {
      expect(() => new CarvedProfileGeometry(closedProfile, 32, 8, depth)).toThrow(RangeError)
    }
    expect(() => new CarvedProfileGeometry(closedProfile, 32, 8, 0.05, {
      height: 1,
      rise: -1,
    })).toThrow(RangeError)
  })
})
