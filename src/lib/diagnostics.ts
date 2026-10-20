import type {Placement, Portrait, RoomId, Vec3} from './gallery/types.ts'
import type {PlayerDumpSnapshot} from './telemetry/recordPlayerDump.ts'
import type {EulerTuple} from 'three/webgpu'
import type {PauseMenuStage} from 'use-pause-menu/core'
import type {CaptureFrameApi} from 'webgpu-capture-bridge'

export type CameraPose = {
  /** vertical field of view in degrees */
  fov: number
  position: Vec3
  /** [pitch, yaw, roll] in radians, applied in YXZ order like the player camera */
  rotation: Vec3
}
export type GalleryDiagnostics = {
  active: string | null
  activeLabel: string | null
  camera: Vec3
  hasControlled: boolean
  held: string | null
  locked: boolean
  menuStage: PauseMenuStage
  /** artwork images still decoding; a fresh pose can request more */
  pendingImages: number
  /** render pipelines still compiling in the background; objects that need them are not drawn yet */
  pendingPipelines: number
  placement: Placement | null
  portraits: Array<Pick<Portrait, 'height' | 'hung' | 'id' | 'merging' | 'pending' | 'position' | 'reserved' | 'title' | 'wallId' | 'width'> & {physical?: {
    x: number
    y: number
    z: number
  }}>
  props: Array<{
    bodyType: number
    collidersEnabled: Array<boolean>
    id: string
    position: {
      x: number
      y: number
      z: number
    }
    sleeping: boolean
    visualPosition: Vec3
  }>
  ready: boolean
  registered: number
  room: RoomId
  rotation: EulerTuple
  saveStatus: string
  /** the environment seed in effect, after the `?seed` override */
  seed: number
  webGPU: boolean
}
type GalleryDebugApi = Partial<CaptureFrameApi> & {
  /** the X dump snapshot of the current view, without logging, copying or sound; null before the player is ready */
  dump?: () => PlayerDumpSnapshot | null
  merge?: (first: string, second: string) => void
  player?: {
    enabled: boolean
    grounded: boolean
    keys: Record<string, boolean>
    position: {
      x: number
      y: number
      z: number
    }
  }
  /** test mode only: detach the camera from the player and frame it exactly, rotation is a YXZ Euler in radians */
  pose?: (pose?: Partial<CameraPose>) => {
    fov: number | null
    position: Vec3
    rotation: Vec3
  }
  snapshot?: () => GalleryDiagnostics
  teleport?: (position: Vec3, rotation: Array<number>) => void
}

declare global {
  var slopGallery: GalleryDebugApi | undefined
  interface Window {
    slopGallery?: GalleryDebugApi
  }
}
