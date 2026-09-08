import type {CaptureFrameApi} from '../types.ts'
import type {Ref} from 'react'

import {useImperativeHandle} from 'react'

import {useCaptureFrame} from './useCaptureFrame.ts'

export type WebgpuCaptureBridgeProps = {
  ref?: Ref<CaptureFrameApi>
}

/** Mount inside a WebGPU Canvas and access captureFrame through a React ref. */
export const WebgpuCaptureBridge = ({ref}: WebgpuCaptureBridgeProps) => {
  const captureFrame = useCaptureFrame()
  useImperativeHandle(ref, () => ({captureFrame}), [captureFrame])
  return null
}
