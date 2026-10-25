import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {angleAnimationFrame, angleStillFrame, animationFps, animationFrames, closeupDistanceScale, closeupFov, closeupSize, closeupStillFrame, distanceScales, distanceStillFrame, frameSizes, inspectionAnimationFrame, inspectionAnimationFrameOffset, inspectionAnimationFrames, inspectionFarTiltRadians, inspectionNearDistanceScale, inspectionNearTiltRadians, previewAngleOffset, previewBaseFov, previewCamera, previewDistance, previewFovForDistanceScale} from '../scripts/lib/renderSettings.ts'
import renderKnot, {parseRenderCategories, renderKnotCli} from '../scripts/renderKnot.ts'
import {knotsById} from '../src/main.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('knot inspection renders', () => {
  test('define stills, simple loops, and the combined 16-second inspection animation', () => {
    expect(inspectionAnimationFrames).toBe(16 * animationFps)
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
    expect(firstFrame.seconds).toBeCloseTo(26 / animationFps)
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
    expect(frameAtSourceSecond(1.5).elevation).toBeCloseTo(-inspectionFarTiltRadians)
    expect(frameAtSourceSecond(5.5).elevation).toBeCloseTo(-inspectionNearTiltRadians)
    expect(frameAtSourceSecond(9.5).elevation).toBeCloseTo(inspectionNearTiltRadians)
    expect(frameAtSourceSecond(13.5).elevation).toBeCloseTo(inspectionFarTiltRadians)
    for (const second of [0, 2.5, 3.5, 4.5, 6.5, 7.5, 8.5, 10.5, 11.5, 12.5, 14.5, 15.5]) {
      expect(frameAtSourceSecond(second).elevation).toBeCloseTo(0, 10)
    }
    const lastFrame = inspectionAnimationFrame(inspectionAnimationFrames - 1)
    expect(lastFrame.distanceScale).toBe(1.8)
    expect(lastFrame.seconds).toBeCloseTo((inspectionAnimationFrameOffset - 1) / animationFps)
    for (const second of [2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5]) {
      expect(frameAtSourceSecond(second).angle % (Math.PI * 2)).toBeCloseTo(Math.PI / 2, 10)
    }
    const slowestAngle = frameAtSourceSecond(3.8).angle % (Math.PI * 2)
    expect(Math.min(slowestAngle, Math.PI * 2 - slowestAngle)).toBeCloseTo(0, 10)
    const turnStart = frameAtSourceSecond(2.5)
    const fastHalfEnd = frameAtSourceSecond(3.1)
    const turnEnd = frameAtSourceSecond(4.5)
    expect(fastHalfEnd.angle - turnStart.angle).toBeCloseTo(Math.PI, 10)
    expect(turnEnd.angle - fastHalfEnd.angle).toBeCloseTo(Math.PI, 10)
    expect(turnEnd.angle - turnStart.angle).toBeCloseTo(Math.PI * 2, 10)
    const halfJoinSourceIndex = Math.round(3.1 * animationFps)
    const halfJoinIndex = (halfJoinSourceIndex - inspectionAnimationFrameOffset + inspectionAnimationFrames) % inspectionAnimationFrames
    const stepBeforeHalfJoin = inspectionAnimationFrame(halfJoinIndex).angle - inspectionAnimationFrame(halfJoinIndex - 1).angle
    const stepAfterHalfJoin = inspectionAnimationFrame(halfJoinIndex + 1).angle - inspectionAnimationFrame(halfJoinIndex).angle
    expect(stepBeforeHalfJoin).toBeCloseTo(stepAfterHalfJoin, 3)
    const turnJoinSourceIndex = Math.round(4.5 * animationFps)
    const turnJoinIndex = (turnJoinSourceIndex - inspectionAnimationFrameOffset + inspectionAnimationFrames) % inspectionAnimationFrames
    const stepBeforeTurnJoin = inspectionAnimationFrame(turnJoinIndex).angle - inspectionAnimationFrame(turnJoinIndex - 1).angle
    const stepAfterTurnJoin = inspectionAnimationFrame(turnJoinIndex + 1).angle - inspectionAnimationFrame(turnJoinIndex).angle
    expect(stepBeforeTurnJoin).toBeCloseTo(stepAfterTurnJoin, 3)
    const fastMiddleIndex = Math.round(2.8 * animationFps) - inspectionAnimationFrameOffset
    const slowMiddleIndex = Math.round(3.8 * animationFps) - inspectionAnimationFrameOffset
    const fastMiddleStep = inspectionAnimationFrame(fastMiddleIndex + 1).angle - inspectionAnimationFrame(fastMiddleIndex).angle
    const slowMiddleStep = inspectionAnimationFrame(slowMiddleIndex + 1).angle - inspectionAnimationFrame(slowMiddleIndex).angle
    expect(fastMiddleStep).toBeGreaterThan(stepAfterHalfJoin)
    expect(slowMiddleStep).toBeLessThan(stepAfterHalfJoin)
    for (const invalid of [-1, animationFrames, 0.5, NaN]) {
      expect(() => angleAnimationFrame(invalid)).toThrow(RangeError)
    }
    for (const invalid of [-1, inspectionAnimationFrames, 0.5, NaN]) {
      expect(() => inspectionAnimationFrame(invalid)).toThrow(RangeError)
    }
  })
  test('places the camera on an orbit around the knot center', () => {
    expect(previewDistance(0.1)).toBe(2.1)
    expect(previewDistance(1.5)).toBeCloseTo(1.5 / Math.sin(previewBaseFov * Math.PI / 360) * 1.08)
    expect(frameSizes.closeup).toEqual(closeupSize)
    const front = previewCamera(angleStillFrame(0), 3)
    expect(front.fov).toBe(previewBaseFov)
    expect(front.position[0]).toBeCloseTo(Math.sin(previewAngleOffset) * 3)
    expect(front.position[1]).toBe(0)
    expect(front.position[2]).toBeCloseTo(Math.cos(previewAngleOffset) * 3)
    const closeup = previewCamera(closeupStillFrame(), 3)
    expect(closeup.fov).toBe(closeupFov)
    expect(Math.hypot(...closeup.position)).toBeCloseTo(3 * closeupDistanceScale)
    const tilted = previewCamera({
      angle: 0,
      distanceScale: 1,
      elevation: Math.PI / 6,
      seconds: 0,
      size: 'video',
    }, 2)
    expect(tilted.position[1]).toBeCloseTo(1)
    expect(Math.hypot(...tilted.position)).toBeCloseTo(2)
  })
  test('parses render categories', () => {
    expect(parseRenderCategories()).toEqual(['snapshot', 'animation', 'video'])
    expect(parseRenderCategories('video, snapshot,video')).toEqual(['video', 'snapshot'])
    expect(() => parseRenderCategories('')).toThrow('comma-separated combination')
    expect(() => parseRenderCategories('snapshot,other')).toThrow('comma-separated combination')
  })
  test('invalid IDs, scenes and help do not require Chrome', async () => {
    await expect(renderKnot('../outside')).rejects.toThrow('Unknown Knot ID')
    const [id] = knotsById.keys()
    await expect(renderKnotCli([id, '--scene', 'studio'], {
      studio2: {
        description: 'unused',
        scene: () => Promise.reject(new Error('unreachable')),
      },
    })).rejects.toThrow('--scene must be one of: transparent, studio2.')
    const child = Bun.spawn(['bun', resolve(root, 'scripts/renderKnot.ts'), '--help'], {
      cwd: tmpdir(),
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const stdoutResponse = new Response(child.stdout)
    const stderrResponse = new Response(child.stderr)
    const [exitCode, stdout, stderr] = await Promise.all([child.exited, stdoutResponse.text(), stderrResponse.text()])
    expect(exitCode, stderr).toBe(0)
    expect(stdout).toContain('--category snapshot,animation,video')
    expect(stdout).toContain('default: snapshot,animation,video')
    expect(stdout).not.toContain('--jxl')
    expect(stdout).toContain('animated angle loop use JPEG XL')
    expect(stdout).toContain('1080x1080 AV1/WebM')
  })
})
