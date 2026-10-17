import type {CaptureFrameApi} from '../types.ts'
import type {Ref} from 'react'

import {useImperativeHandle} from 'react'

import useWebgpuCapture from './useWebgpuCapture.ts'

export type WebgpuCaptureBridgeProps = {
  ref?: Ref<CaptureFrameApi>
}

/** Mount inside a WebGPU Canvas and access captureFrame and capturePixels through a React ref. */
const WebgpuCaptureBridge = ({ref}: WebgpuCaptureBridgeProps) => {
  const capture = useWebgpuCapture()
  useImperativeHandle(ref, () => capture, [capture])
  return null
}

export default WebgpuCaptureBridge
