import type {Vec3} from '../types.ts'

import LogGeometry from '../fireplace/LogGeometry.ts'

export type FirewoodStackOptions = {
  length: number
  radius: number
  /** logs per row, bottom first */
  rows: ReadonlyArray<number>
}

/**
 * A pyramid of split-free logs lying with their ends toward the room, each with its own lumpy shape.
 *
 * Logs run along z in the stack’s frame; their `LogGeometry` runs along y and is turned by 90° around x. The origin is on the floor under the middle of the bottom row.
 */
export default class FirewoodStack {
  /** Bounding size of a stack: width across the bottom row, height and the longest log. */
  static measure({rows, radius, length}: FirewoodStackOptions): Vec3 {
    const spacing = radius * 2.05
    return [rows[0] * spacing, radius * 2 + (rows.length - 1) * spacing * Math.sqrt(3) / 2, length * 1.04]
  }
  readonly logs: ReadonlyArray<{
    geometry: LogGeometry
    position: Vec3
    /** turn around the log’s own axis, so equal shapes never repeat their knobs */
    roll: number
  }>

  readonly size: Vec3

  constructor({rows, radius, length}: FirewoodStackOptions) {
    if (!rows.length || rows.some((count, index) => !Number.isInteger(count) || count < 1 || index > 0 && count >= rows[index - 1]) || !(radius > 0) || !(length > radius * 2)) {
      throw new RangeError('A firewood stack needs shrinking rows of whole logs, a positive radius and logs longer than they are thick.')
    }
    const spacing = radius * 2.05
    // Each row nests in the hollows of the row below.
    const rise = spacing * Math.sqrt(3) / 2
    const logs = []
    let seed = 0.13
    for (const [row, count] of rows.entries()) {
      for (let index = 0; index < count; index++) {
        seed = (seed * 7.31 + 0.377) % 1
        const thickness = radius * (0.9 + seed * 0.2)
        logs.push({
          geometry: new LogGeometry({
            length: length * (0.94 + seed * 0.1),
            radiusTop: thickness * 0.95,
            radiusBottom: thickness,
            seed,
          }, 14, 3),
          position: [(index - (count - 1) / 2) * spacing, radius + row * rise, (seed - 0.5) * 0.04] as Vec3,
          roll: seed * Math.PI * 2,
        })
      }
    }
    this.logs = logs
    this.size = FirewoodStack.measure({
      rows,
      radius,
      length,
    })
  }

  dispose() {
    for (const {geometry} of this.logs) {
      geometry.dispose()
    }
  }
}
