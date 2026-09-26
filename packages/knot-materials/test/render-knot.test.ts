import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {angleAnimationFrame, angleNames, angleStillFrame, animationFps, animationFrames, closeupDistanceScale, closeupFov, closeupSize, closeupStillFrame, distanceNames, distanceScales, distanceStillFrame, inspectionAnimatedJxlDistance, inspectionAnimationFrame, inspectionAnimationFrameOffset, inspectionAnimationFrames, inspectionAnimationOffsetSeconds, inspectionAnimationSeconds, inspectionAnimationSize, inspectionFarTiltRadians, inspectionNearDistanceScale, inspectionNearTiltRadians, inspectionVideoSize, previewBaseFov, previewFovForDistanceScale, previewSupersampling, stillSize} from '../scripts/lib/renderSettings.ts'
import renderKnot, {parseRenderCategories, renderCategories} from '../scripts/renderKnot.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('knot inspection renders', () => {
  test('define stills, simple loops, and the combined 16-second inspection animation', () => {
    expect(stillSize).toBe(2048)
    expect(closeupSize).toEqual([3840, 2160])
    expect(closeupDistanceScale).toBe(0.5)
    expect(closeupFov).toBe(25)
    expect(previewSupersampling).toBe(2)
    expect(angleNames).toEqual(['0', '45', '90'])
    expect(distanceNames).toEqual(['near', 'far'])
    expect(distanceScales).toEqual([0.75, 1.8])
    expect(inspectionAnimatedJxlDistance).toBe(4)
    expect(inspectionAnimationSize).toBe(512)
    expect(inspectionVideoSize).toBe(1024)
    expect([inspectionAnimationSeconds, inspectionAnimationFrames]).toEqual([16, 960])
    expect(previewFovForDistanceScale(1)).toBe(previewBaseFov)
    expect(previewFovForDistanceScale(inspectionNearDistanceScale)).toBeCloseTo(54)
    expect(previewFovForDistanceScale(distanceScales.at(-1)!)).toBeCloseTo(53.39, 2)
    expect(angleStillFrame(0).angle).toBe(0)
    expect(angleStillFrame(1).angle).toBe(Math.PI / 4)
    expect(angleStillFrame(2).angle).toBe(Math.PI / 2)
    expect(distanceStillFrame(0).distanceScale).toBe(0.75)
    expect(distanceStillFrame(1).distanceScale).toBe(1.8)
    expect(closeupStillFrame()).toEqual({
      angle: Math.PI / 4,
      distanceScale: closeupDistanceScale,
      seconds: 0,
      size: 'closeup',
      fov: closeupFov,
    })
    expect(previewFovForDistanceScale(distanceStillFrame(0).distanceScale)).toBeGreaterThan(previewBaseFov)
    expect(previewFovForDistanceScale(distanceStillFrame(1).distanceScale)).toBeGreaterThan(previewBaseFov)
    expect(angleAnimationFrame(0).angle).toBe(0)
    expect(angleAnimationFrame(0).size).toBe('animation')
    expect(angleAnimationFrame(animationFrames - 1).angle).toBeLessThan(Math.PI * 2)
    const frameAtSourceSecond = (seconds: number) => {
      const sourceIndex = Math.round(seconds * animationFps)
      const outputIndex = (sourceIndex - inspectionAnimationFrameOffset + inspectionAnimationFrames) % inspectionAnimationFrames
      return inspectionAnimationFrame(outputIndex)
    }
    const firstFrame = inspectionAnimationFrame(0)
    expect(inspectionAnimationOffsetSeconds).toBe(13.5)
    expect(inspectionAnimationFrameOffset).toBe(10)
    expect(firstFrame.seconds).toBeCloseTo(10 / animationFps)
    expect(firstFrame.size).toBe('video')
    expect(firstFrame.distanceScale).toBe(1.8)
    expect(frameAtSourceSecond(0.5).distanceScale).toBe(1.8)
    expect(frameAtSourceSecond(2.5).distanceScale).toBe(1)
    expect(frameAtSourceSecond(4.5).distanceScale).toBe(1)
    expect(frameAtSourceSecond(6.5).distanceScale).toBe(inspectionNearDistanceScale)
    expect(frameAtSourceSecond(8.5).distanceScale).toBe(inspectionNearDistanceScale)
    expect(frameAtSourceSecond(10.5).distanceScale).toBe(1)
    expect(frameAtSourceSecond(12.5).distanceScale).toBe(1)
    expect(frameAtSourceSecond(14.5).distanceScale).toBe(1.8)
    expect(frameAtSourceSecond(1.5).elevation).toBeCloseTo(inspectionFarTiltRadians)
    expect(frameAtSourceSecond(5.5).elevation).toBeCloseTo(inspectionNearTiltRadians)
    expect(frameAtSourceSecond(9.5).elevation).toBeCloseTo(-inspectionNearTiltRadians)
    expect(frameAtSourceSecond(13.5).elevation).toBeCloseTo(-inspectionFarTiltRadians)
    for (const second of [0, 2.5, 3.5, 4.5, 6.5, 7.5, 8.5, 10.5, 11.5, 12.5, 14.5, 15.5]) {
      expect(frameAtSourceSecond(second).elevation).toBeCloseTo(0, 10)
    }
    const lastFrame = inspectionAnimationFrame(inspectionAnimationFrames - 1)
    expect(lastFrame.distanceScale).toBe(1.8)
    expect(lastFrame.seconds).toBeCloseTo((inspectionAnimationFrameOffset - 1) / animationFps)
    for (const second of [2.5, 3.7, 6.5, 7.7, 10.5, 11.7, 14.5, 15.7]) {
      const wrappedAngle = frameAtSourceSecond(second).angle % (Math.PI * 2)
      expect(Math.min(wrappedAngle, Math.PI * 2 - wrappedAngle)).toBeCloseTo(0, 10)
    }
    const fastSpinStart = frameAtSourceSecond(2.5)
    const fastSpinEnd = frameAtSourceSecond(3.7)
    const slowSpinEnd = frameAtSourceSecond(6.5)
    expect(fastSpinEnd.angle - fastSpinStart.angle).toBeCloseTo(Math.PI * 2, 10)
    expect(slowSpinEnd.angle - fastSpinEnd.angle).toBeCloseTo(Math.PI * 2, 10)
    const joinSourceIndex = Math.round(3.7 * animationFps)
    const joinIndex = (joinSourceIndex - inspectionAnimationFrameOffset + inspectionAnimationFrames) % inspectionAnimationFrames
    const stepBeforeJoin = inspectionAnimationFrame(joinIndex).angle - inspectionAnimationFrame(joinIndex - 1).angle
    const stepAfterJoin = inspectionAnimationFrame(joinIndex + 1).angle - inspectionAnimationFrame(joinIndex).angle
    expect(stepBeforeJoin).toBeCloseTo(stepAfterJoin, 3)
    const fastMiddleIndex = Math.round(3.1 * animationFps) - inspectionAnimationFrameOffset
    const slowMiddleIndex = Math.round(5.1 * animationFps) - inspectionAnimationFrameOffset
    const fastMiddleStep = inspectionAnimationFrame(fastMiddleIndex + 1).angle - inspectionAnimationFrame(fastMiddleIndex).angle
    const slowMiddleStep = inspectionAnimationFrame(slowMiddleIndex + 1).angle - inspectionAnimationFrame(slowMiddleIndex).angle
    expect(fastMiddleStep).toBeGreaterThan(stepAfterJoin)
    expect(slowMiddleStep).toBeLessThan(stepAfterJoin)
    for (const invalid of [-1, animationFrames, 0.5, NaN]) {
      expect(() => angleAnimationFrame(invalid)).toThrow(RangeError)
    }
    for (const invalid of [-1, inspectionAnimationFrames, 0.5, NaN]) {
      expect(() => inspectionAnimationFrame(invalid)).toThrow(RangeError)
    }
  })
  test('parses render categories', () => {
    expect(renderCategories).toEqual(['snapshot', 'animation', 'video'])
    expect(parseRenderCategories()).toEqual(['snapshot', 'animation', 'video'])
    expect(parseRenderCategories('video, snapshot,video')).toEqual(['video', 'snapshot'])
    expect(() => parseRenderCategories('')).toThrow('comma-separated combination')
    expect(() => parseRenderCategories('snapshot,other')).toThrow('comma-separated combination')
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
    expect(stdout).toContain('--category snapshot,animation,video')
    expect(stdout).toContain('default: snapshot,animation,video')
    expect(stdout).not.toContain('--jxl')
    expect(stdout).toContain('animated angle loop use JPEG XL')
    expect(stdout).toContain('1024x1024 AV1/WebM')
  })
})
