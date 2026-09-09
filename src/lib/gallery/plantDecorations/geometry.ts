import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

export function mergeParts(parts: Array<BufferGeometry>) {
  // Preserve shared vertices whenever the parts agree on indexed topology.
  const indexed = parts.every(part => part.index !== null)
  const compatible = indexed ? parts : parts.map(part => {
    return part.index ? part.toNonIndexed() : part
  })
  try {
    const result = mergeGeometries(compatible)
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  } finally {
    for (const part of new Set([...parts, ...compatible])) {
      part.dispose()
    }
  }
}

/** Decimate a row-major blade grid while retaining the sampled normals, colors and UVs. */
export function sampleGrid(source: BufferGeometry, sourceColumns: number, rows: ReadonlyArray<number>, columns: ReadonlyArray<number>) {
  const geometry = new BufferGeometry
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const values: Array<number> = []
    for (const row of rows) {
      for (const column of columns) {
        const vertex = row * (sourceColumns + 1) + column
        for (let component = 0; component < attribute.itemSize; component++) {
          values.push(attribute.getComponent(vertex, component))
        }
      }
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize))
  }
  const indices: Array<number> = []
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns.length - 1; column++) {
      const a = row * columns.length + column
      const b = a + columns.length
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  geometry.setIndex(indices)
  return geometry
}
