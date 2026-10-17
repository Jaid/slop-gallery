import {describe, expect, test} from 'bun:test'
import {join, resolve} from 'node:path'

import fs from 'fs-extra'

import {encodeAnimatedJxl, encodeWebm} from '../scripts/lib/encodeAnimation.ts'

const temporaryDirectory = async (prefix: string) => {
  const temporary = resolve(import.meta.dir, '../../../temp/plugin-tests')
  await fs.ensureDir(temporary)
  return fs.mkdtemp(join(temporary, prefix))
}
describe('animation encoding', () => {
  test.skipIf(!Bun.which('ffmpeg') || !Bun.which('cjxl') || !Bun.which('jxlinfo'))('native animated JXL encoding retains 120 frames, alpha and exactly 2000 milliseconds', async () => {
    const dir = await temporaryDirectory('knot-animation-jxl-')
    try {
      const pattern = join(dir, '%03d.png')
      const filter = "format=rgba,geq=r='mod(N*2,255)':g='X*10':b=120:a='if(lt(X,8),0,255)'"
      await Bun.$`ffmpeg -hide_banner -loglevel error -y -f lavfi -i nullsrc=size=16x16:rate=60:duration=2 -vf ${filter} -frames:v 120 ${pattern}`.quiet()
      const output = await encodeAnimatedJxl(dir, 4)
      const info = await Bun.$`jxlinfo -v ${output}`.text()
      expect(output).toEndWith('.jxl')
      expect(info).toContain('RGB+Alpha')
      expect(info).toContain('Num loops: 0')
      expect(info).toContain('Animation length: 2.000 seconds')
      const durations = Array.from(info.matchAll(/^Frame:.*duration: ([\d.]+) ms/gm), match => Number(match[1]))
      expect(durations).toHaveLength(120)
      expect(durations.reduce((sum, value) => sum + value, 0)).toBe(2000)
      expect(new Set(durations)).toEqual(new Set([16, 17]))
    } finally {
      await fs.remove(dir)
    }
  }, 30_000)
  test.skipIf(!Bun.which('ffmpeg') || !Bun.which('ffprobe'))('native encoding produces 120-frame, two-second AV1/WebM', async () => {
    const dir = await temporaryDirectory('knot-animation-webm-')
    try {
      const pattern = join(dir, '%03d.png')
      const filter = "format=rgba,geq=r='mod(N*2,255)':g='X*10':b=120:a='if(lt(X,8),0,255)'"
      await Bun.$`ffmpeg -hide_banner -loglevel error -y -f lavfi -i nullsrc=size=64x64:rate=60:duration=2 -vf ${filter} -frames:v 120 ${pattern}`.quiet()
      const output = await encodeWebm(dir)
      expect(output).toEndWith('.webm')
      const info = JSON.parse(await Bun.$`ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=codec_name,color_range,color_space,color_primaries,color_transfer,pix_fmt,nb_read_frames,r_frame_rate -show_entries format=duration -of json ${output}`.text()) as {
        format: {duration: string}
        streams: Array<{
          codec_name: string
          color_primaries: string
          color_range: string
          color_space: string
          color_transfer: string
          nb_read_frames: string
          pix_fmt: string
          r_frame_rate: string
        }>
      }
      expect(info.streams).toEqual([{
        codec_name: 'av1',
        color_range: 'pc',
        color_space: 'bt709',
        color_primaries: 'bt709',
        color_transfer: 'iec61966-2-1',
        pix_fmt: 'yuv420p',
        nb_read_frames: '120',
        r_frame_rate: '60/1',
      }])
      expect(Number(info.format.duration)).toBe(2)
      // Container-only tags can hide different metadata in the AV1 bitstream.
      const frames = JSON.parse(await Bun.$`ffprobe -v error -select_streams v:0 -read_intervals %+#1 -show_entries frame=color_range,color_space,color_primaries,color_transfer -of json ${output}`.text()) as {frames: Array<Record<string, string>>}
      expect(frames.frames).toEqual([{
        color_range: 'pc',
        color_space: 'bt709',
        color_primaries: 'bt709',
        color_transfer: 'iec61966-2-1',
      }])
    } finally {
      await fs.remove(dir)
    }
  }, 30_000)
})
