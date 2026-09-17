export const animationFrames = 120
export const animationSeconds = 2
export const animationFps = animationFrames / animationSeconds
export const animationSize = 640

/** Do not duplicate the endpoint: frame 119 advances naturally into frame 0 on the next loop. */
export function animationFrame(index: number) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= animationFrames) {
    throw new RangeError(`Animation frame must be between 0 and ${animationFrames - 1}.`)
  }
  return {
    time: index / animationFps,
    rotation: index / animationFrames * Math.PI * 2,
  }
}

export const animationFilename = (index: number) => `${String(index).padStart(3, '0')}.png`
