import type {Quat as MathQuat, Vec3 as MathVec3} from 'math'

export type {Quat, Vec3} from 'math'
export type RoomId = 'antechamber' | 'corridor' | 'dine' | 'lobby' | 'lodge' | 'moonfall' | 'oculus' | 'salon' | 'sienna' | 'vesper'
export type Portrait = {
  creator: string
  description: string
  flavorJob?: symbol
  height: number
  hung: boolean
  id: string
  imported?: boolean
  /** whether the placard hangs above the frame instead of below it, as in a low slot */
  labelAbove?: boolean
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
/** the aspect ratios of default works and their slots, as width:height */
export type PortraitRatio = '1:1' | '2:3' | '3:2' | '9:16' | '16:9'
/** a default work of the level, before it hangs in a portrait slot */
export type Artwork = Pick<Portrait, 'creator' | 'description' | 'id' | 'narration' | 'title' | 'year'> & {
  ratio: PortraitRatio
  source: string
}
/** a spot on a wall reserved for one default work of matching ratio; players rehang works by wall collisions instead */
export type PortraitSlot = {
  height: number
  id: string
  /** whether the slot hangs low and its work’s placard goes above the frame */
  labelAbove?: boolean
  /** center of the frame, hanging in front of its wall */
  position: MathVec3
  /** Default works fill free slots of higher priority first, and slots of equal priority in random order. */
  priority: number
  ratio: PortraitRatio
  rotation: number
  wallId: string
  width: number
}
export type Placement = {
  inReach: boolean
  /** whether the placard goes above the frame, because below it would block the spot */
  labelAbove?: boolean
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
  /** rolled once per game state and mixed with fixed IDs for environment randomization like the potted plants; part of the undo history, so undoing a new game brings back its environment */
  seed: number
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

/** named player pose that `?spawn` starts at and T cycles through in `?development` */
export type SpawnBookmark = PlayerPose & {
  /** snake_case name that `?spawn` refers to */
  id: string
}

/** named camera view that only `?spawn` reaches, e.g. for deterministic camera snapshots */
export type CameraBookmark = SpawnBookmark & {
  /** camera height above `position` in meters; with it, `?spawn` holds the camera there, detached from the player until the next teleport, for views from mid-jump or lower than standing */
  eyeHeight?: number
}
