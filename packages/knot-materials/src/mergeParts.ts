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
