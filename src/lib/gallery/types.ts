export type Vec3 = [number, number, number]
export type Quat = [number, number, number, number]
export type RoomId = 'afterhours' | 'cabinet' | 'daydream' | 'secret'
export type Portrait = {
  creator: string
  description: string
  height: number
  hung: boolean
  id: string
  imported?: boolean
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
}
export type Placement = {
  inReach: boolean
  position: Vec3
  reason: string
  rotation: number
  valid: boolean
  wallId: string
}
export type GallerySettings = {
  frame: 'black' | 'gold' | 'oak'
  motion: boolean
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
