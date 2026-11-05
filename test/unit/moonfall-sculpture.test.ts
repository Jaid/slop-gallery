import {expect, test} from 'bun:test'

import {Vector3} from 'three/webgpu'

import meteoriteGeometry, {meteoriteCut} from '../../src/lib/gallery/moonfall/MeteoriteGeometry.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

/** the innermost ring’s radius, its tube’s and its bead’s, as `MoonfallOrbit` builds them */
const innerRing = 1.25
const tube = 0.018
const bead = 0.065
test('the meteorite stays lean, keeps clear of the innermost ring and its bead, and is sawn flat on one side', () => {
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
      expect(point.length()).toBeLessThan(innerRing - tube - bead * 2)
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
