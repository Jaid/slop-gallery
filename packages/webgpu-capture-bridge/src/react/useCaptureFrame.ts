import type {CaptureFrame} from '../types.ts'

import {useThree} from '@react-three/fiber/webgpu'
import {useCallback, useEffect, useRef} from 'react'

import {WebgpuCapture} from '../WebgpuCapture.ts'

/** Capture the current Fiber scene and camera, including its active render pipeline. */
export const useCaptureFrame = (): CaptureFrame => {
  const renderer = useThree(state => state.renderer)
  const get = useThree(state => state.get)
  const captureRef = useRef<WebgpuCapture | null>(null)
  useEffect(() => {
    const capture = new WebgpuCapture({
      renderer,
      render: () => {
        const {scene, camera, renderPipeline} = get()
        if (renderPipeline) {
          renderPipeline.render()
        } else {
          renderer.render(scene, camera)
        }
      },
    })
    captureRef.current = capture
    return () => {
      captureRef.current = null
      capture.dispose()
    }
  }, [get, renderer])
  return useCallback(() => {
    if (!captureRef.current) {
      return Promise.reject(new Error('WebGPU capture is not mounted.'))
    }
    return captureRef.current.captureFrame()
  }, [])
}
