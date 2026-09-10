import type {MenuStage} from './gallery/MenuSession.ts'
import type {Placement, Portrait, RoomId, Vec3} from './gallery/types.ts'
import type {EulerTuple} from 'three/webgpu'
import type {CaptureFrameApi} from 'webgpu-capture-bridge'

export type GalleryDiagnostics = {
  active: string | null
  activeLabel: string | null
  camera: Vec3
  hasControlled: boolean
  held: string | null
  locked: boolean
  menuStage: MenuStage
  placement: Placement | null
  portraits: Array<Pick<Portrait, 'height' | 'hung' | 'id' | 'merging' | 'pending' | 'position' | 'reserved' | 'title' | 'wallId' | 'width'> & {physical?: {x: number
    y: number
    z: number}}>
  props: Array<{
    bodyType: number
    collidersEnabled: Array<boolean>
    id: string
    position: {x: number
      y: number
      z: number}
    sleeping: boolean
    visualPosition: Vec3
  }>
  ready: boolean
  registered: number
  room: RoomId
  rotation: EulerTuple
  saveStatus: string
  webGPU: boolean
}
type GalleryDebugApi = Partial<CaptureFrameApi> & {
  merge?: (first: string, second: string) => void
  player?: {enabled: boolean
    grounded: boolean
    keys: Record<string, boolean>
    position: {x: number
      y: number
      z: number}}
  snapshot?: () => GalleryDiagnostics
  teleport?: (position: Vec3, rotation: Array<number>) => void
}

declare global {
  var __gallery: GalleryDebugApi | undefined
  interface Window {
    __gallery?: GalleryDebugApi
  }
}
