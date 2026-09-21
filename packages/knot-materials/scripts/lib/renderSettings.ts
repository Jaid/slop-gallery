import {animationFps, animationFrames} from './animation.ts'

export const stillSize = 2048
export const angleNames = ['000', '090', '180', '270'] as const
export const angleRadians = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2] as const
export const distanceNames = ['near', 'standard', 'far', 'very-far'] as const
export const distanceScales = [0.75, 1, 1.35, 1.8] as const

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
