import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {animationFps, animationFrames} from '../scripts/lib/animation.ts'
import {angleAnimationFrame, angleNames, angleStillFrame, distanceAnimationFrame, distanceNames, distanceScales, distanceStillFrame, inspectionAnimatedJxlDistance, inspectionAnimationFrame, inspectionAnimationFrames, inspectionAnimationSeconds, inspectionNearDistanceScale, inspectionTimeSeamSeconds, previewBaseFov, previewFovForDistanceScale, stillSize} from '../scripts/lib/renderSettings.ts'
import renderKnot from '../scripts/renderKnot.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('knot inspection renders', () => {
  test('define stills, simple loops, and the combined 16-second inspection animation', () => {
    expect(stillSize).toBe(2048)
    expect(angleNames).toEqual(['000', '090', '180', '270'])
    expect(distanceNames).toEqual(['near', 'standard', 'far', 'very-far'])
    expect(distanceScales).toEqual([0.75, 1, 1.35, 1.8])
    expect(inspectionAnimatedJxlDistance).toBe(4)
    expect([inspectionAnimationSeconds, inspectionAnimationFrames]).toEqual([16, 960])
    expect(previewFovForDistanceScale(1)).toBe(previewBaseFov)
    expect(previewFovForDistanceScale(inspectionNearDistanceScale)).toBeCloseTo(54)
    expect(previewFovForDistanceScale(distanceScales.at(-1)!)).toBeCloseTo(53.39, 2)
    expect(angleStillFrame(0).angle).toBe(0)
    expect(angleStillFrame(3).angle).toBe(Math.PI * 3 / 2)
    expect(distanceStillFrame(0).distanceScale).toBe(0.75)
    expect(distanceStillFrame(3).distanceScale).toBe(1.8)
    expect(angleAnimationFrame(0).angle).toBe(0)
    expect(angleAnimationFrame(animationFrames - 1).angle).toBeLessThan(Math.PI * 2)
    expect(distanceAnimationFrame(0).distanceScale).toBeCloseTo(0.75)
    expect(distanceAnimationFrame(animationFrames / 2).distanceScale).toBeCloseTo(1.8)
    const frameAtSecond = (seconds: number) => inspectionAnimationFrame(seconds * animationFps)
    expect(frameAtSecond(0).distanceScale).toBe(1)
    expect(frameAtSecond(2).distanceScale).toBe(1)
    expect(frameAtSecond(4).distanceScale).toBe(inspectionNearDistanceScale)
    expect(frameAtSecond(6).distanceScale).toBe(inspectionNearDistanceScale)
    expect(frameAtSecond(8).distanceScale).toBe(1)
    expect(frameAtSecond(10).distanceScale).toBe(1)
    expect(frameAtSecond(12).distanceScale).toBe(1.8)
    expect(frameAtSecond(14).distanceScale).toBe(1.8)
    expect(inspectionAnimationFrame(inspectionAnimationFrames - 1).distanceScale).toBeCloseTo(1, 5)
    for (const second of [2, 4, 6, 8, 10, 12, 14]) {
      expect(frameAtSecond(second).angle).toBeCloseTo(second / 2 * Math.PI * 2, 10)
    }
    const wideStep = inspectionAnimationFrame(1).angle - inspectionAnimationFrame(0).angle
    const thinIndex = Math.round(0.5 * animationFps)
    const thinStep = inspectionAnimationFrame(thinIndex + 1).angle - inspectionAnimationFrame(thinIndex).angle
    expect(thinStep).toBeGreaterThan(wideStep)
    const seamIndex = inspectionTimeSeamSeconds * animationFps
    const beforeSeam = inspectionAnimationFrame(seamIndex - 1)
    const seam = inspectionAnimationFrame(seamIndex)
    expect(beforeSeam.seconds).toBeGreaterThan(15.9)
    expect(seam.seconds).toBeCloseTo(0)
    expect(seam.distanceScale).toBe(1.8)
    expect(seam.angle % (Math.PI * 2)).toBeCloseTo(Math.PI * 3 / 2, 10)
    expect(inspectionAnimationFrame(inspectionAnimationFrames - 1).seconds).toBeCloseTo(2.5 - 1 / animationFps)
    expect(inspectionAnimationFrame(0).seconds).toBeCloseTo(2.5)
    for (const invalid of [-1, animationFrames, 0.5, NaN]) {
      expect(() => angleAnimationFrame(invalid)).toThrow(RangeError)
      expect(() => distanceAnimationFrame(invalid)).toThrow(RangeError)
    }
    for (const invalid of [-1, inspectionAnimationFrames, 0.5, NaN]) {
      expect(() => inspectionAnimationFrame(invalid)).toThrow(RangeError)
    }
  })
  test('invalid IDs and help do not require Chrome', async () => {
    await expect(renderKnot('../outside')).rejects.toThrow('Unknown Knot ID')
    const child = Bun.spawn(['bun', resolve(root, 'scripts/renderKnot.ts'), '--help'], {
      cwd: tmpdir(),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    expect(exitCode, stderr).toBe(0)
    expect(stdout).toContain('animation.webm')
    expect(stdout).toContain('animated JXL')
    expect(stdout).toContain('out/render/<knot-id>')
  })
})
