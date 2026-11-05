import type {HangingPose, HangingStage} from './base/HangingAnimation.ts'

import {Quaternion, Vector3} from 'three/webgpu'

import HangingAnimation from './base/HangingAnimation.ts'
import {motes, outlineBurst} from './dust.ts'
import {heldOrientation, place, rest, ringing, turn, wobble} from './motion.ts'

/** seconds the work flies from the player’s hands to the wall */
const flight = 0.1
const start = new Quaternion
const rotation = new Quaternion
const offset = new Vector3
const scale = new Vector3
const hook = new Vector3
const wall = new Vector3

/** The work is slapped flat onto the wall straight from the player’s hands, squashes against it, bounces off a little and rocks on its hook, blowing a ring of dust out from under its frame. */
export default class SlapAnimation extends HangingAnimation {
  readonly duration = flight + 1.3
  readonly impact = flight
  override readonly jolt = 0.8

  dust(stage: HangingStage) {
    return [
      ...outlineBurst(stage, {
        count: 130,
        delay: flight,
        speed: 1.9,
      }),
      ...motes(stage, {
        count: 36,
        delay: flight,
        origin: point => [point.x, point.y, stage.back + 0.03],
      }),
    ]
  }

  protected move(time: number, stage: HangingStage, target: HangingPose) {
    if (time < flight) {
      const u = time / flight
      // It speeds up into the slap and lies flat just before it lands.
      rotation.slerpQuaternions(heldOrientation(stage, stage.side * 0.28, start), rest, Math.min(1, u ** 1.4 * 1.2))
      offset.copy(stage.from).multiplyScalar(1 - u * u)
      offset.y += Math.sin(Math.PI * u) * 0.08
      place(target, {
        offset,
        rotation,
      })
      return
    }
    const t = time - flight
    const squash = ringing(t, 42, 16)
    place(target, {
      // It bounces off the wall and back.
      offset: offset.set(0, 0, 0.025 * Math.max(0, wobble(t, 26, 9))),
      pivot: hook.set(0, stage.halfHeight * 0.8, stage.back),
      rotation: turn('z', -stage.side * 0.05 * wobble(t, 13, 3.6), rotation),
      scale: scale.set(1 + 0.06 * squash, 1 + 0.06 * squash, 1 - 0.4 * squash),
      scalePivot: wall.set(0, 0, stage.back),
    })
  }
}
