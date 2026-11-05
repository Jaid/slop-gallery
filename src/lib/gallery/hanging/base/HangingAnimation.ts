import type {Vec3} from 'math'
import type {Quaternion, Vector3} from 'three/webgpu'

import {keepOffWall} from '../motion.ts'

/**
 * A work about to hang, in its own frame: x to its right, y up and z out of its wall, its middle where it will hang at the origin, which its animation ends on.
 */
export type HangingStage = {
  /** how far behind the work’s middle its wall lies, where its frame’s back ends */
  back: number
  /** where the work flies from, the player’s hands, in front of the wall */
  from: Vector3
  /** how far in front of the work’s middle its frame reaches */
  front: number
  /** half the frame’s outer height, its reach included */
  halfHeight: number
  /** half the frame’s outer width, its reach included */
  halfWidth: number
  /** evenly spread fractions from 0 to 1 of the hanging’s own seed */
  random: () => number
  /** 1 if the player stands right of the work, −1 if left of it */
  side: -1 | 1
}

/** where a hanging work is relative to where it ends up, written into its frame’s group each frame */
export type HangingPose = {
  position: Vector3
  quaternion: Quaternion
  scale: Vector3
}

/** a puff or mote of dust the work knocks off its wall, in the work’s frame */
export type DustParticle = {
  /** seconds into the hanging that it comes loose */
  delay: number
  /** how fast the air slows it down, per second */
  drag: number
  /** its acceleration downward in m/s², negative for dust rising in the warm air */
  gravity: number
  /** seconds it lasts */
  life: number
  /** 0–1 */
  opacity: number
  origin: Vec3
  /** its diameter in meters as it comes loose */
  size: number
  /** its diameter in meters once it has billowed out */
  spread: number
  /** in m/s */
  velocity: Vec3
}

/**
 * How a work arrives on its wall when it is hung, rehung or dropped onto it as a new image: how its frame moves and squashes and the dust it knocks off the wall. Its sound is the sound engine’s.
 *
 * Its frame only moves in its group, while the work’s body already hangs where it ends up, so nothing in the physics waits for it.
 */
export default abstract class HangingAnimation {
  /** seconds from the start until the work hangs still */
  abstract readonly duration: number
  /** seconds in that the work first strikes its wall, which jolts its placard */
  abstract readonly impact: number
  /** how hard the impact jolts the placard, 0 for not at all */
  readonly jolt: number = 1

  /** The dust the work knocks loose, in the work’s frame. */
  abstract dust(stage: HangingStage): Array<DustParticle>

  /** Writes the pose `time` seconds in into `target`, which comes in as the work at rest. */
  protected abstract move(time: number, stage: HangingStage, target: HangingPose): void

  /** The pose `time` seconds in, written into `target`, which comes in as the work at rest. Wherever the animation would push the frame into its wall, it stays in front of it instead. */
  pose(time: number, stage: HangingStage, target: HangingPose) {
    this.move(time, stage, target)
    keepOffWall(stage, target)
  }
}
