import type {PlayerPose} from './types.ts'

import {insideLevel, playerSpawn} from '#level/navigation.ts'

import {galleryStorageKey} from '../level.ts'

export {playerSpawn} from '#level/navigation.ts'

const checkpointKey = `${galleryStorageKey}-player`
const copy = (pose: PlayerPose): PlayerPose => ({
  position: [...pose.position],
  yaw: pose.yaw,
  pitch: pose.pitch,
})

export function validatePlayerPose(value: unknown): PlayerPose | null {
  if (!value || typeof value !== 'object' || !('position' in value) || !('yaw' in value)) {
    return null
  }
  const {position, yaw} = value
  const pitch = 'pitch' in value ? value.pitch : 0
  if (!Array.isArray(position) || position.length !== 3 || !position.every(n => typeof n === 'number' && Number.isFinite(n)) || typeof yaw !== 'number' || !Number.isFinite(yaw) || typeof pitch !== 'number' || !Number.isFinite(pitch) || Math.abs(pitch) > Math.PI / 2) {
    return null
  }
  const pose: PlayerPose = {
    position: [...position as PlayerPose['position']],
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    pitch,
  }
  return insideLevel(pose.position) ? pose : null
}

/** Live movement stays outside React and artwork undo history; checkpoints contain no images. */
export class PlayerSession {
  revision = 0
  private pose = copy(playerSpawn)

  capture(value: PlayerPose) {
    const pose = validatePlayerPose(value)
    if (!pose || Math.abs(pose.yaw - this.pose.yaw) < 1e-6 && Math.abs(pose.pitch - this.pose.pitch) < 1e-6 && pose.position.every((n, i) => Math.abs(n - this.pose.position[i]) < 1e-6)) {
      return
    }
    this.pose = pose
    this.revision++
  }

  checkpoint(savedAt = (new Date).toISOString()) {
    try {
      localStorage.setItem(checkpointKey, JSON.stringify({
        player: this.pose,
        savedAt,
      }))
      return true
    } catch {
      return false
    }
  }

  restore(value: unknown) {
    this.pose = validatePlayerPose(value) ?? copy(playerSpawn)
    this.revision++
  }

  resume(savedAt: string) {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(checkpointKey) ?? 'null')
      if (!value || typeof value !== 'object' || !('savedAt' in value) || !('player' in value) || typeof value.savedAt !== 'string') {
        return
      }
      const time = Date.parse(value.savedAt)
      const pose = validatePlayerPose(value.player)
      if (pose && Number.isFinite(time) && time >= (Date.parse(savedAt) || 0)) {
        this.restore(pose)
      }
    } catch {
      // A damaged or unavailable checkpoint must never prevent loading the collection.
    }
  }

  snapshot() {
    return copy(this.pose)
  }
}

export const playerSession = new PlayerSession
