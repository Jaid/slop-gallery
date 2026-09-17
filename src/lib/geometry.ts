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
