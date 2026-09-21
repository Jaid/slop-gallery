import {join} from 'node:path'

import {animationFps, animationFrames} from './animation.ts'

export function validateAnimationEffort(effort: number) {
  if (!Number.isSafeInteger(effort) || effort < 1 || effort > 10) {
    throw new RangeError('Animation encoder effort must be an integer from 1 to 10.')
  }
}

const validateFrameCount = (frameCount: number) => {
  if (!Number.isSafeInteger(frameCount) || frameCount < 1) {
    throw new RangeError('Animation frame count must be a positive safe integer.')
  }
}

export type WebmAnimationOptions = {
  effort?: number
  frameCount?: number
}

/** Encode numbered PNG frames into an infinitely looping, alpha-preserving APNG. */
export async function encodeApng(directory: string, output = join(directory, 'animation.apng')) {
  // APNG/libjxl use a millisecond clock here. Quantize cumulative timestamps,
  // not each 1/60-second duration, to keep the total exactly 2000 ms.
  const timing = `settb=1/1000,setpts=round(N*1000/${animationFps})`
  const finalDelay = (Math.round(animationFrames * 1000 / animationFps) - Math.round((animationFrames - 1) * 1000 / animationFps)) / 1000
  const pattern = join(directory, '%03d.png')
  await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate ${animationFps} -start_number 0 -i ${pattern} -frames:v ${animationFrames} -vf ${timing} -enc_time_base 1:1000 -fps_mode passthrough -c:v apng -pix_fmt rgba -plays 0 -final_delay ${finalDelay} ${output}`.quiet()
  return output
}

/** Encode the simple 120-frame inspection loops as animated JPEG XL. */
export async function encodeAnimatedJxl(directory: string, distance: number, effort = 7) {
  validateAnimationEffort(effort)
  if (!Number.isFinite(distance) || distance < 0) {
    throw new RangeError('JPEG XL distance must be a finite non-negative number.')
  }
  const apng = await encodeApng(directory)
  const output = join(directory, 'animation.jxl')
  await Bun.$`cjxl ${apng} ${output} --distance ${distance} --effort ${effort} --num_threads 1`.quiet()
  return output
}

/** Encode numbered PNG frames directly to AV1/WebM at the shared 60 fps. */
export async function encodeWebm(directory: string, {effort = 7, frameCount = animationFrames}: WebmAnimationOptions = {}) {
  validateAnimationEffort(effort)
  validateFrameCount(frameCount)
  const pattern = join(directory, '%03d.png')
  const output = join(directory, 'animation.webm')
  // libaom's cpu-used is the inverse of the old libjxl effort knob.
  const cpuUsed = Math.round(8 * (10 - effort) / 9)
  await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate ${animationFps} -start_number 0 -i ${pattern} -frames:v ${frameCount} -an -c:v libaom-av1 -crf 18 -b:v 0 -cpu-used ${cpuUsed} -row-mt 1 -pix_fmt yuv444p -color_range pc -g ${frameCount} ${output}`.quiet()
  return output
}

/** Standalone two-second WebM encoder used by the animated-icon script. */
export default async function encodeAnimation(directory: string, effort = 7) {
  return encodeWebm(directory, {effort})
}
