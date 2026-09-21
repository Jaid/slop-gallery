import {join} from 'node:path'

import {animationFps, animationFrames} from './animation.ts'
import {lossyJxlOptions} from './encodeJxl.ts'

const validateFrameCount = (frameCount: number) => {
  if (!Number.isSafeInteger(frameCount) || frameCount < 1) {
    throw new RangeError('Animation frame count must be a positive safe integer.')
  }
}

export const av1Crf = 30
export const av1Preset = 5
export const av1SvtParams = 'lp=4:enable-variance-boost=1:film-grain=0:tune=0:input-depth=8'

export type WebmAnimationOptions = {
  frameCount?: number
}

/** Encode numbered PNG frames into an infinitely looping, alpha-preserving APNG. */
export async function encodeApng(directory: string, output = join(directory, 'animation.apng')) {
  // APNG/libjxl use a millisecond clock here. Quantize cumulative timestamps,
  // not each 1/60-second duration, to keep the total exactly 2000 ms.
  const timing = `settb=1/1000,setpts=round(N*1000/${animationFps})`
  const finalDelay = (Math.round(animationFrames * 1000 / animationFps) - Math.round((animationFrames - 1) * 1000 / animationFps)) / 1000
  const pattern = join(directory, '%03d.png')
  await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate ${animationFps} -start_number 0 -i ${pattern} -frames:v ${animationFrames} -vf ${timing} -enc_time_base 1:1000 -fps_mode passthrough -c:v apng -pix_fmt rgba -plays 0 -final_delay ${finalDelay} -f apng ${output}`.quiet()
  return output
}

/** Encode the simple 120-frame inspection loops as animated JPEG XL. */
export async function encodeAnimatedJxl(directory: string, distance: number) {
  if (!Number.isFinite(distance) || distance < 0) {
    throw new RangeError('JPEG XL distance must be a finite non-negative number.')
  }
  const apng = await encodeApng(directory)
  const output = join(directory, 'animation.jxl')
  await Bun.$`cjxl ${apng} ${lossyJxlOptions(distance)} ${output}`.quiet()
  return output
}

/** Encode numbered PNG frames directly to AV1/WebM at the shared 60 fps. */
export async function encodeWebm(directory: string, {frameCount = animationFrames}: WebmAnimationOptions = {}) {
  validateFrameCount(frameCount)
  const pattern = join(directory, '%03d.png')
  const output = join(directory, 'animation.webm')
  await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate ${animationFps} -start_number 0 -i ${pattern} -frames:v ${frameCount} -an -c:v libsvtav1 -preset ${av1Preset} -crf ${av1Crf} -svtav1-params ${av1SvtParams} -pix_fmt yuv420p -color_range pc -g ${frameCount} ${output}`.quiet()
  return output
}

/** Standalone two-second WebM encoder used by the animated-icon script. */
export default async function encodeAnimation(directory: string) {
  return encodeWebm(directory)
}
