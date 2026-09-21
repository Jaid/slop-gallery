import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import fs from 'fs-extra'

import {animationFilename, animationFps, animationFrame, animationFrames, animationSeconds} from '../scripts/lib/animation.ts'
import encodeAnimation, {encodeAnimatedJxl} from '../scripts/lib/encodeAnimation.ts'
import {lossyJxlOptions} from '../scripts/lib/encodeJxl.ts'
import PromptSources from '../scripts/lib/PromptSources.ts'
import makeAnimatedIcon from '../scripts/makeAnimatedIcon.ts'
import makePrompt from '../scripts/makePrompt.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('authoring context', () => {
  test('includes the complete selected candidate API even when none of the examples use it', async () => {
    const prompt = await makePrompt({
      candidate: 'gpt_astra',
      exampleIds: ['opal_fire'],
    })
    for (const file of await fs.readdir(resolve(root, 'src/candidates/gpt_astra/lib'))) {
      if (!file.endsWith('.ts')) {
        continue
      }
      const source = await fs.readFile(resolve(root, 'src/candidates/gpt_astra/lib', file), 'utf8')
      expect(prompt).toContain(source.trimEnd())
    }
    expect(prompt).toContain('- `../../candidates/gpt_astra/lib/premiumIntimate.ts`')
    expect(prompt).not.toContain('### src/StudioEnvironment.ts')
    expect(prompt).not.toContain('### scripts/lib/')
    expect(prompt).not.toContain('### src/candidates/grok/lib/')
  })
  test('follows imports, type declarations, reexports and cycles, but not arbitrary directory contents or comment text', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'prompt-graph-'))
    try {
      await fs.outputFile(join(dir, 'lib/index.ts'), "export * from './used.ts'\nexport type * from './types.ts'\n")
      await fs.outputFile(join(dir, 'lib/used.ts'), "import {value} from './dependency.ts'\n// import './imaginary.ts'\nexport const used = value\n")
      await fs.outputFile(join(dir, 'lib/dependency.ts'), "import type {Value} from './types.ts'\nexport const value: Value = 1\n")
      await fs.outputFile(join(dir, 'lib/types.ts'), "export type * from './index.ts'\nexport type Value = number\n")
      await fs.outputFile(join(dir, 'lib/unrelated.ts'), 'throw new Error("Do not evaluate or include me")\n')
      const context = new PromptSources(dir)
      await context.add('lib/index.ts')
      expect([...context.files.keys()].toSorted()).toEqual(['lib/dependency.ts', 'lib/index.ts', 'lib/types.ts', 'lib/used.ts'])
      expect(context.markdown()).not.toContain('Do not evaluate')
      expect(context.markdown().match(/### lib\/types.ts/g)).toHaveLength(1)
    } finally {
      await fs.remove(dir)
    }
  })
})
describe('animated icons', () => {
  test('samples exactly one turn without a repeated endpoint and a two-second 60-fps timeline', () => {
    expect([animationFrames, animationSeconds, animationFps]).toEqual([120, 2, 60])
    const frames = Array.from({length: animationFrames}, (_, index) => animationFrame(index))
    expect(frames[0]).toEqual({
      time: 0,
      rotation: 0,
    })
    expect(frames[60].rotation).toBe(Math.PI)
    expect(frames[119].rotation).toBeLessThan(Math.PI * 2)
    expect(frames[119].time + 1 / animationFps).toBe(2)
    expect(animationFilename(0)).toBe('000.png')
    expect(animationFilename(119)).toBe('119.png')
    for (const invalid of [-1, 120, 0.5, NaN]) {
      expect(() => animationFrame(invalid)).toThrow(RangeError)
    }
  })
  test('invalid arguments fail before opening the browser; help works independently', async () => {
    await expect(makeAnimatedIcon({
      id: '../outside',
      browserURL: 'invalid',
    })).rejects.toThrow('Unknown Knot ID')
    await expect(makeAnimatedIcon({
      id: 'opal_fire',
      output: 'bad.gif',
      browserURL: 'invalid',
    })).rejects.toThrow('.webm')
    for (const effort of [0, 11, 2.5, NaN]) {
      await expect(makeAnimatedIcon({
        id: 'opal_fire',
        effort,
        browserURL: 'invalid',
      })).rejects.toThrow('effort')
    }
    const child = Bun.spawn(['bun', resolve(root, 'scripts/makeAnimatedIcon.ts'), '--help'], {
      cwd: tmpdir(),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [exit, out, err] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    expect(exit, err).toBe(0)
    expect(out).toContain('120 frames, 2 seconds')
  })
  test.skipIf(!Bun.which('ffmpeg') || !Bun.which('cjxl') || !Bun.which('jxlinfo'))('native animated JXL encoding retains 120 frames, alpha and exactly 2000 milliseconds', async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), 'knot-animation-jxl-test-'))
    try {
      const pattern = join(dir, '%03d.png')
      const filter = "format=rgba,geq=r='mod(N*2,255)':g='X*10':b=120:a='if(lt(X,8),0,255)'"
      await Bun.$`ffmpeg -hide_banner -loglevel error -y -f lavfi -i nullsrc=size=16x16:rate=60:duration=2 -vf ${filter} -frames:v 120 ${pattern}`.quiet()
      expect(lossyJxlOptions()).toEqual(['--effort', '10', '--brotli_effort', '11', '--distance', '1'])
      expect(lossyJxlOptions(4)).toEqual(['--effort', '10', '--brotli_effort', '11', '--distance', '4'])
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
      await Bun.$`ffmpeg -hide_banner -loglevel error -y -f lavfi -i nullsrc=size=16x16:rate=60:duration=2 -vf ${filter} -frames:v 120 ${pattern}`.quiet()
      const output = await encodeAnimation(dir, 1)
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
        pix_fmt: 'yuv444p',
        nb_read_frames: '120',
        r_frame_rate: '60/1',
      }])
      expect(Number(info.format.duration)).toBe(2)
    } finally {
      await fs.remove(dir)
    }
  }, 30_000)
})
