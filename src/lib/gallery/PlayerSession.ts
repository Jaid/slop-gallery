import type World from '#src/worlds/base/World.ts'
import type {PlayerPose} from './types.ts'

import {wrapAngle} from 'math'

import currentWorld from '#src/worlds/current.ts'

const copy = (pose: PlayerPose): PlayerPose => ({
  position: [...pose.position],
  yaw: pose.yaw,
  pitch: pose.pitch,
})

/** A copy of the pose with its yaw wrapped, if its numbers are finite, it looks no further than straight up or down and it stands inside the world, or else null. */
export function validatePlayerPose({position, yaw, pitch}: PlayerPose, within: Pick<World, 'contains'> = currentWorld): PlayerPose | null {
  if (![...position, yaw, pitch].every(Number.isFinite) || Math.abs(pitch) > Math.PI / 2 || !within.contains(position)) {
    return null
  }
  return {
    position: [...position],
    yaw: wrapAngle(yaw),
    pitch,
  }
}

/** Live movement stays outside React. */
export default class PlayerSession {
  private pose: PlayerPose

  /** Keeps a player’s pose in the world, starting at its spawn. */
  constructor(private readonly world: Pick<World, 'contains' | 'floorHeight' | 'spawn'>) {
    this.pose = copy(world.spawn)
  }

  capture(value: PlayerPose) {
    const pose = validatePlayerPose(value, this.world)
    if (pose) {
      this.pose = pose
    }
  }

  restore(value: PlayerPose) {
    const pose = validatePlayerPose(value, this.world)
    this.pose = pose ? this.onFloor(pose) : copy(this.world.spawn)
  }

  snapshot() {
    return copy(this.pose)
  }

  /** Puts feet that ended up below the floor under them back onto it, as a fall through a room that had not loaded yet left them. */
  private onFloor(pose: PlayerPose): PlayerPose {
    const floor = this.world.floorHeight(pose.position)
    return pose.position[1] < floor ? {
      ...pose,
      position: [pose.position[0], floor + 0.04, pose.position[2]],
    } : pose
  }
}

/** the player’s session in the current world */
export const playerSession = new PlayerSession(currentWorld)
