import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fs from 'fs-extra'

import {av1Crf, av1Preset, av1SvtParams, encodeAnimatedJxl, encodeWebm} from '../scripts/lib/encodeAnimation.ts'
import {jxlBrotliEffort, jxlEffort, lossyJxlOptions} from '../scripts/lib/encodeJxl.ts'
import {animationFilename, animationFps, animationFrames} from '../scripts/lib/renderSettings.ts'

describe('animation encoding', () => {
  test('declared encoding settings agree with the arguments passed to native encoders', () => {
    expect(lossyJxlOptions()).toEqual(['--effort', String(jxlEffort), '--brotli_effort', String(jxlBrotliEffort), '--distance', '1', '--keep_invisible', '0'])
    expect(lossyJxlOptions(4)).toEqual(['--effort', String(jxlEffort), '--brotli_effort', String(jxlBrotliEffort), '--distance', '4', '--keep_invisible', '0'])
    expect(av1Preset).toBeGreaterThanOrEqual(0)
    expect(av1Preset).toBeLessThanOrEqual(13)
    expect(av1Crf).toBe(30)
    expect(av1SvtParams).toBe('lp=4:enable-variance-boost=1:film-grain=0:tune=0:input-depth=8')
  })
  test('uses a two-second 60-fps source sequence', () => {
    expect([animationFrames, animationFps, animationFrames / animationFps]).toEqual([120, 60, 2])
    expect(animationFilename(0)).toBe('000.png')
    expect(animationFilename(119)).toBe('119.png')
  })
  test.skipIf(!Bun.which('ffmpeg') || !Bun.which('cjxl') || !Bun.which('jxlinfo'))('native animated JXL encoding retains 120 frames, alpha and exactly 2000 milliseconds', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'knot-animation-jxl-test-'))
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
    const dir = await fs.mkdtemp(join(tmpdir(), 'knot-animation-test-'))
    try {
      const pattern = join(dir, '%03d.png')
      const filter = "format=rgba,geq=r='mod(N*2,255)':g='X*10':b=120:a='if(lt(X,8),0,255)'"
      await Bun.$`ffmpeg -hide_banner -loglevel error -y -f lavfi -i nullsrc=size=64x64:rate=60:duration=2 -vf ${filter} -frames:v 120 ${pattern}`.quiet()
      const output = await encodeWebm(dir)
      expect(output).toEndWith('.webm')
      const info = JSON.parse(await Bun.$`ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=codec_name,color_range,pix_fmt,nb_read_frames,r_frame_rate -show_entries format=duration -of json ${output}`.text()) as {
        format: {duration: string}
        streams: Array<{
          codec_name: string
          color_range: string
          nb_read_frames: string
          pix_fmt: string
          r_frame_rate: string
        }>
      }
      expect(info.streams).toEqual([{
        codec_name: 'av1',
        color_range: 'pc',
        pix_fmt: 'yuv420p',
        nb_read_frames: '120',
        r_frame_rate: '60/1',
      }])
      expect(Number(info.format.duration)).toBe(2)
    } finally {
      await fs.remove(dir)
    }
  }, 30_000)
})
