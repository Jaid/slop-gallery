import type {Quat as MathQuat, Vec3 as MathVec3} from 'math'

export type {Quat, Vec3} from 'math'
export type RoomId = 'antechamber' | 'corridor' | 'dine' | 'lobby' | 'lodge' | 'moonfall' | 'oculus' | 'sienna' | 'vesper'
export type Portrait = {
  creator: string
  description: string
  flavorJob?: symbol
  height: number
  hung: boolean
  id: string
  imported?: boolean
  mergeJob?: symbol
  merging?: boolean
  narration?: string
  orientation?: MathQuat
  pending?: boolean
  position: MathVec3
  reserved?: boolean
  rotation: number
  source: Blob | string
  title: string
  velocity?: MathVec3
  wallId?: string
  width: number
  year?: number
}
export type Placement = {
  inReach: boolean
  position: MathVec3
  reason: string
  rotation: number
  valid: boolean
  wallId: string
}
export type {NarrationState} from 'use-narrator/core'
export type GallerySettings = {
  sound: boolean
}
export type GallerySnapshot = {
  portraits: Array<Portrait>
}
export type GalleryDocument = GallerySnapshot & {
  player: PlayerPose
  savedAt: string
  settings: GallerySettings
  version: 1
}

export type PlayerPose = {
  pitch: number
  /** World-space feet position, independent of head bob and inspection cameras. */
  position: MathVec3
  yaw: number
}
