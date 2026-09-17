import {join} from 'node:path'

import {animationFps, animationFrames} from './animation.ts'

export function validateAnimationEffort(effort: number) {
  if (!Number.isSafeInteger(effort) || effort < 1 || effort > 10) {
    throw new RangeError('Animation encoder effort must be an integer from 1 to 10.')
  }
}

/** APNG preserves full RGBA and exact rational frame delays on the way to animated JPEG XL. */
export default async function encodeAnimation(directory: string, effort = 7) {
  validateAnimationEffort(effort)
  const apng = join(directory, 'animation.apng')
  const output = join(directory, 'animation.jxl')
  // libjxl imports APNG delays on a millisecond clock. Quantize cumulative
  // timestamps, not each 1/60-second duration, to keep the total exactly 2000 ms.
  const timing = `settb=1/1000,setpts=round(N*1000/${animationFps})`
  const finalDelay = (Math.round(animationFrames * 1000 / animationFps) - Math.round((animationFrames - 1) * 1000 / animationFps)) / 1000
  const pattern = join(directory, '%03d.png')
  await Bun.$`ffmpeg -hide_banner -loglevel error -y -framerate ${animationFps} -start_number 0 -i ${pattern} -frames:v ${animationFrames} -vf ${timing} -enc_time_base 1:1000 -fps_mode passthrough -c:v apng -pix_fmt rgba -plays 0 -final_delay ${finalDelay} ${apng}`.quiet()
  await Bun.$`cjxl ${apng} ${output} --distance 1 --effort ${effort} --num_threads 1`.quiet()
  return output
}
