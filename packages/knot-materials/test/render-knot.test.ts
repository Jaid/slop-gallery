import {describe, expect, test} from 'bun:test'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {animationFrames} from '../scripts/lib/animation.ts'
import {angleAnimationFrame, angleNames, angleStillFrame, distanceAnimationFrame, distanceNames, distanceScales, distanceStillFrame, stillSize} from '../scripts/lib/renderSettings.ts'
import renderKnot from '../scripts/renderKnot.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
describe('knot inspection renders', () => {
  test('define four 2048px still views and two complete 120-frame sweeps', () => {
    expect(stillSize).toBe(2048)
    expect(angleNames).toEqual(['000', '090', '180', '270'])
    expect(distanceNames).toEqual(['near', 'standard', 'far', 'very-far'])
    expect(distanceScales).toEqual([0.75, 1, 1.35, 1.8])
    expect(angleStillFrame(0).angle).toBe(0)
    expect(angleStillFrame(3).angle).toBe(Math.PI * 3 / 2)
    expect(distanceStillFrame(0).distanceScale).toBe(0.75)
    expect(distanceStillFrame(3).distanceScale).toBe(1.8)
    expect(angleAnimationFrame(0).angle).toBe(0)
    expect(angleAnimationFrame(animationFrames - 1).angle).toBeLessThan(Math.PI * 2)
    expect(distanceAnimationFrame(0).distanceScale).toBeCloseTo(0.75)
    expect(distanceAnimationFrame(animationFrames / 2).distanceScale).toBeCloseTo(1.8)
    for (const invalid of [-1, animationFrames, 0.5, NaN]) {
      expect(() => angleAnimationFrame(invalid)).toThrow(RangeError)
      expect(() => distanceAnimationFrame(invalid)).toThrow(RangeError)
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
    expect(stdout).toContain('out/render/<knot-id>')
  })
})
