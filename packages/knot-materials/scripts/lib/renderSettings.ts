import {animationFps, animationFrames, animationSeconds} from './animation.ts'

export const stillSize = 2048
export const angleNames = ['000', '090', '180', '270'] as const
export const angleRadians = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2] as const
export const distanceNames = ['near', 'standard', 'far', 'very-far'] as const
export const distanceScales = [0.75, 1, 1.35, 1.8] as const
export const inspectionAnimationSeconds = 16
export const inspectionAnimationFrames = inspectionAnimationSeconds * animationFps
export const inspectionAnimatedJxlDistance = 4
export const inspectionNearDistanceScale = 0.5
export const inspectionAnimationOffsetSeconds = 13.5
export const previewBaseFov = 50
export const previewFovForDistanceScale = (distanceScale: number) => previewBaseFov * (1 + Math.abs(Math.log2(distanceScale)) * 0.08)

export type RenderFrame = {
  angle: number
  distanceScale: number
  seconds: number
  size: 'animation' | 'still'
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

export const distanceAnimationFrame = (index: number): RenderFrame => {
  assertFrameIndex(index)
  const minimum = distanceScales[0]
  const maximum = distanceScales.at(-1)!
  const phase = index / animationFrames * Math.PI * 2
  return {
    angle: 0,
    distanceScale: (minimum + maximum) / 2 - Math.cos(phase) * (maximum - minimum) / 2,
    seconds: index / animationFps,
    size: 'animation',
  }
}

const smootherstep = (value: number) => value * value * value * (value * (value * 6 - 15) + 10)
const transition = (from: number, to: number, seconds: number, start: number) => {
  const progress = smootherstep((seconds - start) / animationSeconds)
  return from + (to - from) * progress
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
const inspectionAngle = (seconds: number) => {
  const linear = seconds / animationSeconds * Math.PI * 2
  // Preserve every cardinal orientation while lingering near the broad front/back views.
  return linear - 0.2 * Math.sin(linear * 2)
}

export const inspectionAnimationFrame = (index: number): RenderFrame => {
  assertInspectionFrameIndex(index)
  const previewSeconds = index / animationFps
  const choreographySeconds = (previewSeconds + inspectionAnimationOffsetSeconds) % inspectionAnimationSeconds
  return {
    angle: inspectionAngle(choreographySeconds),
    distanceScale: inspectionDistanceScale(choreographySeconds),
    seconds: previewSeconds,
    size: 'animation',
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

export {animationFps, animationFrames, animationSize} from './animation.ts'
