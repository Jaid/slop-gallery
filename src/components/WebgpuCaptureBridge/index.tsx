import type {CaptureFrameApi} from 'webgpu-capture-bridge'

import {useEffect} from 'react'
import {useCaptureFrame} from 'webgpu-capture-bridge/react'

type GalleryDebugApi = Partial<CaptureFrameApi> & Record<string, unknown>

declare global {
  var __gallery: GalleryDebugApi | undefined
  interface Window {
    __gallery?: GalleryDebugApi
  }
}
// Only the gallery adapter knows about the app’s global diagnostics API.
const WebgpuCaptureBridge = () => {
  const captureFrame = useCaptureFrame()
  useEffect(() => {
    globalThis.__gallery ??= {}
    const gallery = globalThis.__gallery
    gallery.captureFrame = captureFrame
    return () => {
      if (gallery.captureFrame === captureFrame) {
        delete gallery.captureFrame
      }
    }
  }, [captureFrame])
  return null
}
export default WebgpuCaptureBridge
