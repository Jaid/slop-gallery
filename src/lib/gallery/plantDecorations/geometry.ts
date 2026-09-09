import type {BufferGeometry} from 'three/webgpu'

import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export function mergeParts(parts: Array<BufferGeometry>) {
  const flat = parts.map(part => {
    return part.index ? part.toNonIndexed() : part
  })
  try {
    const result = mergeGeometries(flat)
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  } finally {
    for (const part of new Set([...parts, ...flat])) {
      part.dispose()
    }
  }
}
