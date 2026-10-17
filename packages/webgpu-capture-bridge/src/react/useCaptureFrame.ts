import type {CaptureFrame} from '../types.ts'

import useWebgpuCapture from './useWebgpuCapture.ts'

/** Capture the current Fiber scene and camera, including its active render pipeline. */
const useCaptureFrame = (): CaptureFrame => useWebgpuCapture().captureFrame

export default useCaptureFrame
