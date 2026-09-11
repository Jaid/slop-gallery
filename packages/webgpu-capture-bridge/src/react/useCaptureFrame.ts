import type {CaptureFrame} from '../types.ts'

import {useThree} from '@react-three/fiber/webgpu'
import {useCallback, useEffect, useRef} from 'react'

import WebgpuCapture from '../WebgpuCapture.ts'

/** Capture the current Fiber scene and camera, including its active render pipeline. */
const useCaptureFrame = (): CaptureFrame => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const pipeline = useThree(state => state.renderPipeline)
  const captureRef = useRef<WebgpuCapture | null>(null)
  useEffect(() => {
    const capture = new WebgpuCapture({
      renderer,
      scene,
      camera,
      pipeline,
    })
    captureRef.current = capture
    return () => {
      captureRef.current = null
      capture.dispose()
    }
  }, [camera, pipeline, renderer, scene])
  return useCallback(() => {
    if (!captureRef.current) {
      return Promise.reject(new Error('WebGPU capture is not mounted.'))
    }
    return captureRef.current.captureFrame()
  }, [])
}

export default useCaptureFrame
