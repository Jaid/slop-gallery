import type {EgoZoomMode} from './EgoZoom.ts'

const extendedZoomScale = 0.25

export default function getEgoPointerSpeed(base: number, zoomMode: EgoZoomMode) {
  return zoomMode === 'extended' ? base * extendedZoomScale : base
}
