import type {EgoZoomMode} from './EgoZoom.ts'

const extendedZoomScale = 0.1

export default function getEgoPointerSpeed(base: number, zoomMode: EgoZoomMode) {
  return zoomMode === 'extended' ? base * extendedZoomScale : base
}
