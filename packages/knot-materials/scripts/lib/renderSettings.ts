import {fade} from 'math'

export const animationFrames = 120
const animationSeconds = 2
export const animationFps = animationFrames / animationSeconds
export const animationFilename = (index: number) => `${String(index).padStart(3, '0')}.png`

export const stillSize = 2048
export const closeupSize = [3840, 2160] as const
export const closeupDistanceScale = 0.5
export const closeupFov = 25
export const angleNames = ['0', '45', '90'] as const
export const angleRadians = [0, Math.PI / 4, Math.PI / 2] as const
export const distanceNames = ['near', 'far'] as const
export const distanceScales = [0.75, 1.8] as const
export const inspectionAnimationSeconds = 16
export const inspectionAnimationFrames = inspectionAnimationSeconds * animationFps
export const inspectionAnimationFrameOffset = 10
export const inspectionAnimatedJxlDistance = 4
export const inspectionAnimationSize = 512
export const inspectionVideoSize = 1024
export const inspectionNearDistanceScale = 0.5
export const inspectionTiltRadians = Math.PI / 18
export const inspectionAnimationOffsetSeconds = 13.5
export const previewBaseFov = 50
export const previewSupersampling = 2
export const previewFovForDistanceScale = (distanceScale: number) => previewBaseFov * (1 + Math.abs(Math.log2(distanceScale)) * 0.08)

export type RenderFrame = {
  angle: number
  distanceScale: number
  elevation?: number
  fov?: number
  seconds: number
  size: 'animation' | 'closeup' | 'still' | 'video'
}

const assertFrameIndex = (index: number) => {
  if (!Number.isSafeInteger(index) || index < 0 || index >= animationFrames) {
    throw new RangeError(`Animation frame must be between 0 and ${animationFrames - 1}.`)
  }
}
const assertInspectionFrameIndex = (index: number) => {
  if (!Number.isSafeInteger(index) || index < 0 || index >= inspectionAnimationFrames) {
    throw new RangeError(`Inspection animation frame must be between 0 and ${inspectionAnimationFrames - 1}.`)
  }
}

export const angleAnimationFrame = (index: number): RenderFrame => {
  assertFrameIndex(index)
  return {
    angle: index / animationFrames * Math.PI * 2,
    distanceScale: 1,
    seconds: index / animationFps,
    size: 'animation',
  }
}

const transition = (from: number, to: number, seconds: number, start: number) => {
  const progress = fade((seconds - start) / animationSeconds)
  return from + (to - from) * progress
}
const movementTilt = (seconds: number, start: number, direction: -1 | 1) => {
  const progress = fade((seconds - start) / animationSeconds)
  return direction * inspectionTiltRadians * Math.sin(progress * Math.PI)
}
const inspectionDistanceScale = (seconds: number) => {
  const normal = 1
  if (seconds < 2) {
    return normal
  }
  if (seconds < 4) {
    return transition(normal, inspectionNearDistanceScale, seconds, 2)
  }
  if (seconds < 6) {
    return inspectionNearDistanceScale
  }
  if (seconds < 8) {
    return transition(inspectionNearDistanceScale, normal, seconds, 6)
  }
  if (seconds < 10) {
    return normal
  }
  const far = distanceScales.at(-1)!
  if (seconds < 12) {
    return transition(normal, far, seconds, 10)
  }
  if (seconds < 14) {
    return far
  }
  return transition(far, normal, seconds, 14)
}
const inspectionElevation = (seconds: number) => {
  if (seconds >= 2 && seconds < 4) {
    return movementTilt(seconds, 2, 1)
  }
  if (seconds >= 6 && seconds < 8) {
    return movementTilt(seconds, 6, -1)
  }
  if (seconds >= 10 && seconds < 12) {
    return movementTilt(seconds, 10, -1)
  }
  if (seconds >= 14) {
    return movementTilt(seconds, 14, 1)
  }
  return 0
}
const inspectionSpinSeconds = [1.2, 2.8] as const
const inspectionSpinCycleSeconds = inspectionSpinSeconds[0] + inspectionSpinSeconds[1]
const inspectionSpinBoundarySpeed = 2 / inspectionSpinCycleSeconds
const inspectionAngle = (seconds: number) => {
  const cycle = Math.floor(seconds / inspectionSpinCycleSeconds)
  const cycleSeconds = seconds - cycle * inspectionSpinCycleSeconds
  const isFastSpin = cycleSeconds < inspectionSpinSeconds[0]
  const spinSeconds = inspectionSpinSeconds[isFastSpin ? 0 : 1]
  const spinStart = isFastSpin ? 0 : inspectionSpinSeconds[0]
  const completedSpins = cycle * 2 + (isFastSpin ? 0 : 1)
  const progress = (cycleSeconds - spinStart) / spinSeconds
  // Keep cycle-average boundary momentum while easing within each spin.
  const boundaryProgress = inspectionSpinBoundarySpeed * spinSeconds * progress
  const easedProgress = boundaryProgress + (1 - inspectionSpinBoundarySpeed * spinSeconds) * fade(progress)
  return (completedSpins + easedProgress) * Math.PI * 2
}

export const inspectionAnimationFrame = (index: number): RenderFrame => {
  assertInspectionFrameIndex(index)
  const sourceIndex = (index + inspectionAnimationFrameOffset) % inspectionAnimationFrames
  const previewSeconds = sourceIndex / animationFps
  const choreographySeconds = (previewSeconds + inspectionAnimationOffsetSeconds) % inspectionAnimationSeconds
  return {
    angle: inspectionAngle(choreographySeconds),
    distanceScale: inspectionDistanceScale(choreographySeconds),
    elevation: inspectionElevation(choreographySeconds),
    seconds: previewSeconds,
    size: 'video',
  }
}

export const angleStillFrame = (index: number): RenderFrame => ({
  angle: angleRadians[index],
  distanceScale: 1,
  seconds: 0,
  size: 'still',
})

export const distanceStillFrame = (index: number): RenderFrame => ({
  angle: 0,
  distanceScale: distanceScales[index],
  seconds: 0,
  size: 'still',
})

export const closeupStillFrame = (): RenderFrame => ({
  angle: Math.PI / 4,
  distanceScale: closeupDistanceScale,
  seconds: 0,
  size: 'closeup',
  fov: closeupFov,
})
