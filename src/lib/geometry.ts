import type {BufferGeometry} from 'three/webgpu'

import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js'

/** Merge owned mesh parts, retaining hard normals and UV seams when indexing extrusions. */
export function mergeParts(parts: Array<BufferGeometry>) {
  const indexed: Array<BufferGeometry> = []
  try {
    for (const part of parts) {
      indexed.push(part.index ? part : mergeVertices(part, 1e-6))
    }
    const geometry = mergeGeometries(indexed)
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
  } finally {
    for (const part of new Set([...parts, ...indexed])) {
      part.dispose()
    }
  }
}

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

