import type {BufferGeometry} from 'three/webgpu'

export {mergeParts} from 'knot-materials/mergeParts.ts'

/** Model triangles, counted once per mesh – not multiplied by shadows or material sides. */
export function triangleCount(geometry: BufferGeometry | null) {
  if (!geometry) {
    return 0
  }
  if (geometry.index) {
    return geometry.index.count / 3
  }
  return geometry.hasAttribute('position') ? geometry.getAttribute('position').count / 3 : 0
}

/** Fewest segments, in multiples of four, that keep a regular polygon within `tolerance` meters of its circle. */
export function circleSegments(radius: number, tolerance = 0.0005) {
  if (!(radius > 0) || !(tolerance > 0)) {
    throw new RangeError('Circle tessellation needs a positive radius and tolerance.')
  }
  const segments = Math.PI / Math.acos(1 - Math.min(1, tolerance / radius))
  return Math.max(8, Math.ceil(segments / 4) * 4)
}
