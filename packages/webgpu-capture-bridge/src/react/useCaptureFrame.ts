import type {CaptureFrame} from '../types.ts'
import type {TSLRootState} from '@react-three/tsl'

import {useThree} from '@react-three/fiber'
import {useCallback, useEffect, useRef} from 'react'

import WebgpuCapture from '../WebgpuCapture.ts'

/** Capture the current Fiber scene and camera, including its active render pipeline. */
const useCaptureFrame = (): CaptureFrame => {
  const renderer = useThree(state => state.renderer)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  // The pipeline slot is defined by @react-three/tsl, whether its useRenderPipeline or the app fills it.
  const pipeline: TSLRootState['renderPipeline'] = useThree(state => state.renderPipeline)
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
