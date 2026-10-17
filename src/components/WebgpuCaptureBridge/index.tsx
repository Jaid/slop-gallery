import '#src/lib/diagnostics.ts'

import {useEffect} from 'react'
import {useWebgpuCapture} from 'webgpu-capture-bridge/react'

// Only the gallery adapter knows about the app’s global diagnostics API.
const WebgpuCaptureBridge = () => {
  const {captureFrame, capturePixels} = useWebgpuCapture()
  useEffect(() => {
    globalThis.slopGallery ??= {}
    const gallery = globalThis.slopGallery
    gallery.captureFrame = captureFrame
    gallery.capturePixels = capturePixels
    return () => {
      if (gallery.captureFrame === captureFrame) {
        delete gallery.captureFrame
      }
      if (gallery.capturePixels === capturePixels) {
        delete gallery.capturePixels
      }
    }
  }, [captureFrame, capturePixels])
  return null
}
export default WebgpuCaptureBridge
