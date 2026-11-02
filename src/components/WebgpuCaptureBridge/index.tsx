import '#src/lib/diagnostics.ts'

import {useEffect} from 'react'
import {useWebgpuCapture} from 'webgpu-capture-bridge/react'

import {captureWarmup} from '#src/lib/rendering/captureWarmup.ts'

/** Refuses to capture while the canvas still renders at the capture warmup’s reduced scale. */
const afterWarmup = <Capture extends () => Promise<unknown>>(capture: Capture) => (async () => {
  if (captureWarmup.active) {
    throw new Error('The page still warms up at ?warmup_scale; end the warmup through the end_warmup WebMCP tool before capturing.')
  }
  return capture()
}) as Capture
// Only the gallery adapter knows about the app’s global diagnostics API.
const WebgpuCaptureBridge = () => {
  const {captureFrame, capturePixels} = useWebgpuCapture()
  useEffect(() => {
    globalThis.slopGallery ??= {}
    const gallery = globalThis.slopGallery
    const guardedFrame = afterWarmup(captureFrame)
    const guardedPixels = afterWarmup(capturePixels)
    gallery.captureFrame = guardedFrame
    gallery.capturePixels = guardedPixels
    return () => {
      if (gallery.captureFrame === guardedFrame) {
        delete gallery.captureFrame
      }
      if (gallery.capturePixels === guardedPixels) {
        delete gallery.capturePixels
      }
    }
  }, [captureFrame, capturePixels])
  return null
}
export default WebgpuCaptureBridge
