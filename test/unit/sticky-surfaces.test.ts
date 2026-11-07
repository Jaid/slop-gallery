import type {Wall} from '../../src/lib/placement/wallGeometry.ts'

import {describe, expect, test} from 'bun:test'

import {Triangle, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {readShowSticky} from '../../src/lib/placement/showSticky.ts'
import stickySurfaceGeometry from '../../src/lib/placement/stickySurfaceGeometry.ts'
import {wallOffset} from '../../src/lib/placement/wallGeometry.ts'

const wall = (overrides: Partial<Wall> = {}): Wall => ({
  id: 'test-north',
  room: 'test',
  center: [1, 0.5, -2],
  rotation: 0.3,
  width: 4,
  height: 3,
  ...overrides,
})
/** every triangle of the geometry, with its area and its normal, as precise as its 32-bit positions */
const triangles = (walls: ReadonlyArray<Wall>) => {
  const geometry = stickySurfaceGeometry(walls)
  const position = geometry.getAttribute('position')
  const index = geometry.index!
  return Array.from({length: index.count / 3}, (_, face) => {
    const corner = (offset: number) => {
      const point = new Vector3
      return point.fromBufferAttribute(position, index.getX(face * 3 + offset))
    }
    const triangle = new Triangle(corner(0), corner(1), corner(2))
    return {
      triangle,
      area: triangle.getArea(),
      normal: triangle.getNormal(new Vector3),
    }
  })
}
const area = (walls: ReadonlyArray<Wall>) => triangles(walls).reduce((sum, {area: part}) => sum + part, 0)
describe('?show_sticky', () => {
  test('is enabled by a bare or true flag only', () => {
    expect(readShowSticky('?show_sticky')).toBe(true)
    expect(readShowSticky('?show_sticky=true')).toBe(true)
    for (const search of ['', '?show_sticky=false', '?show_sticky=1', '?show_sticky=TRUE', '?sticky=true']) {
      expect(readShowSticky(search)).toBe(false)
    }
  })
  test('covers a whole sticky wall, facing out of it, just in front of its plaster', () => {
    const target = wall()
    expect(area([target])).toBeCloseTo(12, 5)
    for (const {triangle, normal} of triangles([target])) {
      expect(normal.x).toBeCloseTo(Math.sin(target.rotation), 5)
      expect(normal.z).toBeCloseTo(Math.cos(target.rotation), 5)
      expect(wallOffset(target, triangle.a.toArray())).toBeGreaterThan(wallFace)
      expect(wallOffset(target, triangle.a.toArray())).toBeLessThan(wallFace + 0.02)
      for (const corner of [triangle.a, triangle.b, triangle.c]) {
        expect(corner.y).toBeGreaterThanOrEqual(target.center[1] - 1e-9)
        expect(corner.y).toBeLessThanOrEqual(target.center[1] + target.height + 1e-9)
      }
    }
  })
  test('leaves out walls that are not sticky', () => {
    expect(triangles([wall({sticky: false})])).toHaveLength(0)
    expect(area([wall({sticky: false}), wall({
      id: 'test-south',
      rotation: Math.PI,
    })])).toBeCloseTo(12, 5)
  })
  test('leaves out openings and reservations', () => {
    expect(area([wall({holes: [{
      u: 0.5,
      width: 1,
      height: 2,
      profile: 'rectangle',
    }]})])).toBeCloseTo(10, 5)
    expect(area([wall({holes: [{
      u: -1,
      width: 0.6,
      bottom: 1,
      height: 1.6,
      profile: 'round',
    }]})])).toBeCloseTo(12 - Math.PI * 0.09, 2)
    expect(area([wall({reservations: [{
      u: 1,
      width: 0.2,
      bottom: 1,
      height: 1.3,
      profile: 'rectangle',
      reason: 'lightSwitch',
    }]})])).toBeCloseTo(12 - 0.06, 5)
    // A semicircular arch, springing at 1.8 m.
    expect(area([wall({holes: [{
      u: 0,
      width: 1.2,
      height: 2.4,
      profile: 'arch',
    }]})])).toBeCloseTo(12 - 1.2 * 1.8 - Math.PI * 0.36 / 2, 2)
  })
  test('cuts an opening reaching past the wall’s top off there', () => {
    expect(area([wall({holes: [{
      u: 0,
      width: 2,
      height: 4,
      profile: 'rectangle',
    }]})])).toBeCloseTo(6, 5)
  })
  test('rakes along a sloping wall', () => {
    const target = wall({
      rotation: 0,
      slope: 0.5,
    })
    expect(area([target])).toBeCloseTo(12, 5)
    const lowest = Math.min(...triangles([target]).flatMap(({triangle}) => [triangle.a, triangle.b, triangle.c].filter(corner => corner.x < target.center[0] - 1.99).map(corner => corner.y)))
    expect(lowest).toBeCloseTo(target.center[1] - 1, 5)
  })
  test('bends round a curved wall, facing out of it', () => {
    const target = wall({curveRadius: 3})
    const offset = wallFace + 0.01
    // The face lies on a circle `offset` closer to the bend’s axis, so it spans that much less of the arc.
    expect(area([target])).toBeCloseTo(4 * (3 - offset) / 3 * 3, 2)
    for (const {triangle} of triangles([target])) {
      for (const corner of [triangle.a, triangle.b, triangle.c]) {
        expect(wallOffset(target, corner.toArray())).toBeCloseTo(offset, 5)
      }
    }
  })
})
