export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export type RoomId = 'afterhours' | 'amber' | 'cabinet' | 'daydream' | 'secret'
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
  orientation?: Quat
  pending?: boolean
  position: Vec3
  reserved?: boolean
  rotation: number
  source: Blob | string
  title: string
  velocity?: Vec3
  wallId?: string
  width: number
  year?: number
}
export type Placement = {
  inReach: boolean
  position: Vec3
  reason: string
  rotation: number
  valid: boolean
  wallId: string
}
export type NarrationState = {id: string} & (
  | {source: 'audio' | 'browser'
    status: 'playing'}
  | {source: null
    status: 'preparing'}
)
export type GallerySettings = {
  frame: 'black' | 'gold' | 'oak'
  sound: boolean
  theme: 'ivory' | 'nocturne' | 'sage'
}
export type GallerySnapshot = {
  portraits: Array<Portrait>
}
export type GalleryDocument = GallerySnapshot & {
  savedAt: string
  settings: GallerySettings
  version: 1
}
