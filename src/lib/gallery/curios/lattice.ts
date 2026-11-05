import type {Vec3} from '../types.ts'

import {BufferGeometry, Float32BufferAttribute} from 'three/webgpu'

/** a point of a lattice, with the values of its extra attribute, if any */
export type LatticePoint = {
  position: Vec3
  values?: ReadonlyArray<number>
}

/**
 * A closed band of surface over `rows` of as many points each, every row closing round from its last point to its first, with smooth normals all round.
 * Seen from outside, the rows run down the band, so to say, and the points of every row round it to the right: a row at the front of an upright band runs from left to right. Its first and last row may each be closed by a fan round a point of its own, a `start` and an `end` cap.
 * With `extra`, every point carries an attribute of that name with its `values`.
 */
export default function latticeGeometry(rows: ReadonlyArray<ReadonlyArray<LatticePoint>>, {end, extra, start}: {
  end?: LatticePoint
  extra?: {
    name: string
    size: number
  }
  start?: LatticePoint
} = {}) {
  const columns = rows[0].length
  if (rows.length < 2 || columns < 3 || rows.some(row => row.length !== columns)) {
    throw new RangeError('A lattice needs at least two rows of at least three points each, all as long.')
  }
  const points = [...rows.flat(), ...start ? [start] : [], ...end ? [end] : []]
  const positions = new Float32Array(points.length * 3)
  const values = extra ? new Float32Array(points.length * extra.size) : undefined
  for (const [index, {position, values: own = []}] of points.entries()) {
    positions.set(position, index * 3)
    if (!(values && extra)) {
      continue
    }
    if (own.length !== extra.size) {
      throw new RangeError(`Every point of a lattice needs ${extra.size} values of its ${extra.name}.`)
    }
    values.set(own, index * extra.size)
  }
  const at = (row: number, column: number) => row * columns + column % columns
  const indices: Array<number> = []
  for (let row = 0; row < rows.length - 1; row++) {
    for (let column = 0; column < columns; column++) {
      const [a, b, c, d] = [at(row, column), at(row + 1, column), at(row, column + 1), at(row + 1, column + 1)]
      indices.push(a, b, c, c, b, d)
    }
  }
  let cap = rows.length * columns
  if (start) {
    for (let column = 0; column < columns; column++) {
      indices.push(cap, at(0, column), at(0, column + 1))
    }
    cap++
  }
  if (end) {
    const last = rows.length - 1
    for (let column = 0; column < columns; column++) {
      indices.push(cap, at(last, column + 1), at(last, column))
    }
  }
  const geometry = new BufferGeometry
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  if (values && extra) {
    geometry.setAttribute(extra.name, new Float32BufferAttribute(values, extra.size))
  }
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
