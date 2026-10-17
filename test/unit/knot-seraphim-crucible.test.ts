import {expect, test} from 'bun:test'

import {knotLength, knotTubeRadius} from '../../packages/knot-materials/src/candidates/gemini_argon/lib/tubeMetric.ts'
import knotData from '../../packages/knot-materials/src/entries/seraphim_crucible/data.ts'
import {knotGeometryArgs} from '../../packages/knot-materials/src/geometry.ts'

test('Seraphim Crucible swells stay resolvable by the shared knot mesh and inside the declared displacement bound', () => {
  const [, , tubular, radial] = knotGeometryArgs
  const vertexSpacingAlong = knotLength / tubular
  const vertexSpacingAround = Math.PI * 2 * knotTubeRadius / radial
  // Highest harmonic of every lobe still spans several vertices: rings (36 × 1 along u), ribs (6 × 2 around v) and helices (up to 7 × 4 along u, 3 × 4 around v).
  expect(knotLength / 36 / vertexSpacingAlong).toBeGreaterThan(6)
  expect(Math.PI * 2 * knotTubeRadius / (6 * 2) / vertexSpacingAround).toBeGreaterThan(5)
  expect(tubular / (7 * 4)).toBeGreaterThan(9)
  expect(radial / (3 * 4)).toBeGreaterThan(5)
  // Peak displacement (lobe weights × 0.0075) stays within the declared culling and collision bound.
  expect((0.65 + 0.5 + 0.85 + 0.7) * 0.0075).toBeLessThanOrEqual(knotData.displacement)
})
