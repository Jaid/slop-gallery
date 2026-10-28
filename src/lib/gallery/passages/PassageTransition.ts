import type {FloorRectangle} from '../floors.ts'
import type Passage from './Passage.ts'

import {subtractFloorOpening} from '../floors.ts'

/** Depth of each timber portal along the passage. */
export const transitionFrameDepth = 0.22
/** The last portal projects into the room’s doorway reveal, so its face never shares a plane with the stone wall and vault ends. */
export const transitionMouthProjection = 0.03

/**
 * The final meter or so of a stone passage, where it turns into the timber room it opens into.
 *
 * Seen from the stone side: a timber portal on a raised wooden saddle, a fully boarded bay and a last portal casing the room’s doorway.
 * Plank flooring runs flush from the first portal into the room.
 */
export default class PassageTransition {
  /** Floor area handed from stone paving to the timber sill and planks. */
  readonly floor: FloorRectangle
  /** Distances along the final span at which each portal begins, ordered from stone to timber. */
  readonly frames: readonly [number, number]
  /** The plank floor behind the sill. */
  readonly planks: FloorRectangle
  /** The footprint of the timber saddle under the first portal, which stands a few centimeters proud of the paving and the planks. */
  readonly sill: FloorRectangle
  /** Run of the final span, from its start point to the passage mouth. */
  readonly spanLength: number
  /** Distance along the final span where the stone ends. */
  readonly start: number
  /** The passage’s paving without the transition; collision still uses the full passage floors. */
  readonly stoneFloors: Array<FloorRectangle>

  constructor(readonly passage: Passage, readonly length = 1.11) {
    const span = passage.spans.at(-1)!
    const {start, end} = span
    this.spanLength = Math.hypot(end[0] - start[0], end[1] - start[1])
    // The final span starts with the open elbow when the passage turns.
    const usable = this.spanLength - (passage.spans.length > 1 ? passage.width / 2 : 0)
    if (!Number.isFinite(length) || length < transitionFrameDepth * 4 || length > usable) {
      throw new RangeError(`A passage transition needs between ${transitionFrameDepth * 4} m and the final span’s ${usable} m of straight run.`)
    }
    this.start = this.spanLength - length
    this.frames = [this.start, this.spanLength - transitionFrameDepth]
    const rectangle = (from: number, to: number): FloorRectangle => {
      const along = (from + to) / 2
      const x = start[0] + (end[0] - start[0]) * along / this.spanLength
      const z = start[1] + (end[1] - start[1]) * along / this.spanLength
      const alongX = start[1] === end[1]
      return {
        center: [x, z],
        size: alongX ? [to - from, passage.width] : [passage.width, to - from],
      }
    }
    this.floor = rectangle(this.start, this.spanLength)
    this.sill = rectangle(this.start, this.start + transitionFrameDepth)
    this.planks = rectangle(this.start + transitionFrameDepth, this.spanLength)
    // Rounding in the passage partition can leave zero-width slivers next to the cut.
    this.stoneFloors = passage.floors.flatMap(floor => subtractFloorOpening(floor, this.floor)).filter(({size}) => size.every(value => value > 1e-6))
  }
}
