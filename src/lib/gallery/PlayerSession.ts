import type World from '#src/worlds/base/World.ts'
import type {PlayerPose} from './types.ts'

import {wrapAngle} from 'math'

import currentWorld from '#src/worlds/current.ts'

import {localStore} from '../temporary.ts'

const copy = (pose: PlayerPose): PlayerPose => ({
  position: [...pose.position],
  yaw: pose.yaw,
  pitch: pose.pitch,
})

/** The pose if it is well-formed and inside the world, or null. */
export function validatePlayerPose(value: unknown, within: Pick<World, 'contains'> = currentWorld): PlayerPose | null {
  if (!value || typeof value !== 'object' || !('position' in value) || !('yaw' in value) || !('pitch' in value)) {
    return null
  }
  const {position, yaw, pitch} = value
  if (!Array.isArray(position) || position.length !== 3 || !position.every(n => typeof n === 'number' && Number.isFinite(n)) || typeof yaw !== 'number' || !Number.isFinite(yaw) || typeof pitch !== 'number' || !Number.isFinite(pitch) || Math.abs(pitch) > Math.PI / 2) {
    return null
  }
  const pose: PlayerPose = {
    position: [...position as PlayerPose['position']],
    yaw: wrapAngle(yaw),
    pitch,
  }
  return within.contains(pose.position) ? pose : null
}

/** Live movement stays outside React; checkpoints contain no images. */
export default class PlayerSession {
  revision = 0
  private readonly checkpointKey: string
  private pose: PlayerPose

  /** Keeps a player’s pose in the world, starting at its spawn. */
  constructor(private readonly world: Pick<World, 'contains' | 'floorHeight' | 'spawn' | 'storageKey'>) {
    this.checkpointKey = `${world.storageKey}-player`
    this.pose = copy(world.spawn)
  }

  capture(value: PlayerPose) {
    const pose = validatePlayerPose(value, this.world)
    if (!pose || Math.abs(pose.yaw - this.pose.yaw) < 1e-6 && Math.abs(pose.pitch - this.pose.pitch) < 1e-6 && pose.position.every((n, i) => Math.abs(n - this.pose.position[i]) < 1e-6)) {
      return
    }
    this.pose = pose
    this.revision++
  }

  checkpoint(savedAt?: string) {
    const checkpointedAt = new Date
    try {
      localStore().setItem(this.checkpointKey, JSON.stringify({
        player: this.pose,
        savedAt: savedAt ?? checkpointedAt.toISOString(),
      }))
      return true
    } catch {
      return false
    }
  }

  restore(value: unknown) {
    const pose = validatePlayerPose(value, this.world)
    this.pose = pose ? this.onFloor(pose) : copy(this.world.spawn)
    this.revision++
  }

  resume(savedAt: string) {
    try {
      const value: unknown = JSON.parse(localStore().getItem(this.checkpointKey) ?? 'null')
      if (!value || typeof value !== 'object' || !('savedAt' in value) || !('player' in value) || typeof value.savedAt !== 'string') {
        return
      }
      const time = Date.parse(value.savedAt)
      const pose = validatePlayerPose(value.player, this.world)
      if (pose && Number.isFinite(time) && time >= (Date.parse(savedAt) || 0)) {
        this.restore(pose)
        return true
      }
    } catch {
      // A damaged or unavailable checkpoint must never prevent loading the collection.
    }
    return false
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
