import type {Box, BoxInput} from './box/index.ts'
import type {Fence, Position} from './types.ts'

import {createBox} from './box/index.ts'

/** a space fenced by the union of one or more boxes */
export default class Geofence implements Fence {
  readonly boxes: ReadonlyArray<Box>

  /** Takes boxes or their plain data, see {@link createBox}. */
  constructor(boxes: ReadonlyArray<Box | BoxInput>) {
    if (!boxes.length) {
      throw new RangeError('A geofence needs at least one box.')
    }
    this.boxes = Object.freeze(boxes.map(box => createBox(box)))
  }

  /** Whether any of the boxes contains the position. */
  contains(position: Position) {
    return this.boxes.some(box => box.contains(position))
  }

  /** A new geofence with every box moved by the offset, like from a room’s relative fence to its world fence. */
  translate(offset: Position) {
    return new Geofence(this.boxes.map(box => box.translate(offset)))
  }
}
