import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

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
