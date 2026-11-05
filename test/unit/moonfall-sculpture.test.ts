import {expect, test} from 'bun:test'

import {Vector3} from 'three/webgpu'

import armillaryBandGeometry, {armillaryBand} from '../../src/lib/gallery/moonfall/ArmillaryBandGeometry.ts'
import meteoriteGeometry, {meteoriteCut} from '../../src/lib/gallery/moonfall/MeteoriteGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

/** the innermost ring’s radius and its bead’s, as `MoonfallOrbit` builds them */
const innerRing = 1.25
const bead = 0.065
test('the meteorite stays lean, keeps clear of the innermost band and its bead, and is sawn flat on one side', () => {
  const radius = 0.7
  const geometry = meteoriteGeometry(radius, 14)
  try {
    expect(triangleCount(geometry)).toBe(20 * 15 ** 2)
    const position = geometry.getAttribute('position')
    expect([...position.array].every(Number.isFinite)).toBe(true)
    const point = new Vector3
    let onCut = 0
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i)
      expect(point.length()).toBeLessThan(innerRing - armillaryBand.thickness / 2 - bead * 2)
      const along = point.dot(meteoriteCut.normal)
      expect(along).toBeLessThanOrEqual(meteoriteCut.depth * radius + 1e-6)
      if (along > meteoriteCut.depth * radius - 1e-6) {
        onCut++
      }
    }
    // The sawn face takes in a fair share of the surface, not a few vertices.
    expect(onCut / position.count).toBeGreaterThan(0.03)
  } finally {
    geometry.dispose()
  }
})
test('an armillary band costs no more than the tube it replaced and lies flat round its ring', () => {
  const radius = innerRing
  const geometry = armillaryBandGeometry(radius, 128)
  try {
    // The old tube: 8 sides × 128 segments × 2 triangles.
    expect(triangleCount(geometry)).toBeLessThanOrEqual(8 * 128 * 2)
    geometry.computeBoundingBox()
    const {min, max} = geometry.boundingBox!
    expect(max.x).toBeCloseTo(radius + armillaryBand.thickness / 2, 4)
    expect(min.y).toBeCloseTo(-radius - armillaryBand.thickness / 2, 2)
    expect(max.z - min.z).toBeCloseTo(armillaryBand.width, 6)
  } finally {
    geometry.dispose()
  }
})
