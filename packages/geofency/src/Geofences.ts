import type {Fence, Position} from './types.ts'

/** fences by id, checked in insertion order */
export default class Geofences<Id = string, Value extends Fence = Fence> extends Map<Id, Value> {
  /** The id of the first fence that contains the position, or null if none does. */
  getMatch(position: Position) {
    return this.entries().find(([, fence]) => fence.contains(position))?.[0] ?? null
  }

  /** The ids of every fence that contains the position, in insertion order. */
  getMatches(position: Position) {
    return this.entries().filter(([, fence]) => fence.contains(position)).map(([id]) => id).toArray()
  }
}
