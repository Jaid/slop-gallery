import type {HangingPose, HangingStage} from '../../src/lib/gallery/hanging/index.ts'
import type WallDust from '../../src/lib/gallery/hanging/WallDust.ts'

import {describe, expect, test} from 'bun:test'

import {mulberry32} from 'math/random'
import {Group, Quaternion, Vector3} from 'three/webgpu'

import {frameBack} from '../../src/lib/frames/base/PortraitFrame.ts'
import HangingRun from '../../src/lib/gallery/hanging/HangingRun.ts'
import {requestHanging, takeHanging} from '../../src/lib/gallery/hanging/hangings.ts'
import {hangingAnimation as animation} from '../../src/lib/gallery/hanging/index.ts'

const front = 0.06
const sizes = [[0.5, 0.5], [0.9, 1.4], [1.7, 0.95]] as const
const froms = [[0, 0, 1], [0.9, 0.2, 0.8], [-0.9, -0.3, 1.2], [0.2, 0.8, 0.35], [-0.4, -1, 1.7], [1.4, 0, 0.3]] as const
const stage = (width: number, height: number, from: Readonly<[number, number, number]>, seed = 7): HangingStage => {
  const random = mulberry32.create(seed)
  return {
    back: frameBack,
    from: new Vector3(...from),
    front,
    halfHeight: height / 2 + 0.08,
    halfWidth: width / 2 + 0.08,
    random: () => mulberry32.sample(random),
    side: from[0] < 0 ? -1 : 1,
  }
}
const restingPose = (): HangingPose => ({
  position: new Vector3,
  quaternion: new Quaternion,
  scale: new Vector3(1, 1, 1),
})
const poseAt = (time: number, on: HangingStage) => {
  const pose = restingPose()
  animation.pose(time, on, pose)
  return pose
}
/** the corners of the frame’s box, posed */
const corners = (pose: HangingPose, {halfWidth, halfHeight, back}: HangingStage) => {
  const points: Array<Vector3> = []
  for (const x of [-halfWidth, halfWidth]) {
    for (const y of [-halfHeight, halfHeight]) {
      for (const z of [back, front]) {
        const point = new Vector3(x, y, z)
        points.push(point.multiply(pose.scale).applyQuaternion(pose.quaternion).add(pose.position))
      }
    }
  }
  return points
}
const rest = new Quaternion
const request = () => ({
  animation,
  from: [3, 1.5, -0.5] as [number, number, number],
  position: [1, 1.6, 0.2] as [number, number, number],
  rotation: Math.PI / 2,
  seed: 3,
})
const work = {
  floor: 0,
  front,
  height: 1.2,
  reach: 0.08,
  width: 0.9,
}
const fakeDust = () => {
  const emitted: Array<Parameters<WallDust['emit']>[0]> = []
  return {
    dust: {
      now: 50,
      emit: (particles: Parameters<WallDust['emit']>[0]) => emitted.push([...particles]),
    } as unknown as WallDust,
    emitted,
  }
}
describe('the hanging animation', () => {
  test('strikes the wall before it ends', () => {
    expect(animation.impact).toBeGreaterThan(0)
    expect(animation.impact).toBeLessThan(animation.duration)
    expect(animation.duration).toBeLessThan(2)
  })
  test('starts in the player’s hands, ends exactly where the work hangs and never reaches into the wall', () => {
    for (const [width, height] of sizes) {
      for (const from of froms) {
        const on = stage(width, height, from)
        expect(poseAt(0, on).position.distanceTo(on.from)).toBeLessThan(1e-6)
        const end = poseAt(animation.duration, on)
        expect(end.position.length()).toBeLessThan(2e-3)
        expect(end.quaternion.angleTo(rest)).toBeLessThan(2e-3)
        expect(end.scale.distanceTo(new Vector3(1, 1, 1))).toBeLessThan(2e-3)
        for (let time = 0; time <= animation.duration; time += 1 / 240) {
          const pose = poseAt(time, on)
          for (const corner of corners(pose, on)) {
            if (corner.z < frameBack - 4e-3) {
              throw new Error(`It reaches ${((frameBack - corner.z) * 1000).toFixed(1)} mm into the wall ${time.toFixed(3)} s in, from ${from.join(', ')} for ${width} × ${height}`)
            }
          }
          expect(pose.scale.z).toBeGreaterThan(0.25)
        }
      }
    }
  })
  test('moves without jumps', () => {
    for (const from of froms) {
      const on = stage(0.9, 1.2, from)
      let previous = corners(poseAt(0, on), on)
      for (let time = 1 / 240; time <= animation.duration; time += 1 / 240) {
        const current = corners(poseAt(time, on), on)
        const step = Math.max(...current.map((corner, i) => corner.distanceTo(previous[i])))
        // 60 m/s at most for any corner
        if (step > 0.25) {
          throw new Error(`It jumps ${step.toFixed(3)} m ${time.toFixed(3)} s in, from ${from.join(', ')}`)
        }
        previous = current
      }
    }
  })
  test('knocks dust off in front of the wall once it strikes it', () => {
    for (const from of froms) {
      const dust = animation.dust(stage(0.9, 1.2, from))
      expect(dust.length).toBeGreaterThan(20)
      for (const particle of dust) {
        expect([...particle.origin, ...particle.velocity, particle.delay, particle.life, particle.size, particle.drag, particle.gravity].every(Number.isFinite)).toBe(true)
        expect(particle.origin[2]).toBeGreaterThanOrEqual(frameBack)
        expect(particle.velocity[2]).toBeGreaterThanOrEqual(0)
        expect(particle.delay).toBeGreaterThanOrEqual(animation.impact)
        expect(particle.delay).toBeLessThan(animation.duration)
        expect(particle.life).toBeGreaterThan(0)
        expect(particle.size).toBeGreaterThan(0)
        expect(particle.spread).toBeGreaterThanOrEqual(particle.size)
        expect(particle.opacity).toBeGreaterThan(0)
        expect(particle.opacity).toBeLessThanOrEqual(1)
        expect(particle.drag).toBeGreaterThan(0)
      }
    }
  })
})
describe('hanging runs', () => {
  test('come from the player’s side in the work’s own frame', () => {
    // The work faces +x, so its right is −z, where the player stands.
    const run = new HangingRun(request(), work)
    expect(run.stage.side).toBe(1)
    expect(run.stage.from.z).toBeGreaterThan(0)
  })
  test('pose the frame, send the dust flying at its impact and settle at their end', () => {
    const run = new HangingRun(request(), work)
    const art = new Group
    const placard = new Group
    const {dust, emitted} = fakeDust()
    expect(run.update(0.05, art, placard, dust)).toBe(true)
    expect(art.position.length()).toBeGreaterThan(0.1)
    expect(emitted).toHaveLength(0)
    expect(run.update(0.08, art, placard, dust)).toBe(true)
    expect(emitted).toHaveLength(1)
    const [particles] = emitted
    const particle = [...particles][0]
    // born when it came loose, 0.03 s ago at most, in front of the wall, which faces +x here
    expect(particle.birth).toBeGreaterThan(49.95)
    expect(particle.birth).toBeLessThanOrEqual(50)
    expect(particle.origin[0]).toBeGreaterThan(1 + frameBack - 1e-6)
    expect(particle.velocity[0]).toBeGreaterThanOrEqual(0)
    expect(particle.floor).toBe(0)
    expect(placard.rotation.z).not.toBe(0)
    while (run.update(0.05, art, placard, dust)) {
      // runs on until it ends
    }
    expect(art.position.toArray()).toEqual([0, 0, 0])
    expect(art.quaternion.toArray()).toEqual([0, 0, 0, 1])
    expect(art.scale.toArray()).toEqual([1, 1, 1])
    expect(placard.position.toArray()).toEqual([0, 0, 0])
    expect(placard.rotation.z).toBe(0)
  })
  test('settle their work when it is taken off the wall midway', () => {
    const run = new HangingRun(request(), work)
    const art = new Group
    const placard = new Group
    run.update(0.15, art, placard, null)
    expect(art.scale.z).not.toBe(1)
    run.settle(art, placard)
    expect(art.position.toArray()).toEqual([0, 0, 0])
    expect(art.scale.toArray()).toEqual([1, 1, 1])
    expect(placard.rotation.z).toBe(0)
  })
  test('wait until their work hangs where they asked for', () => {
    requestHanging('work', [1, 2, 3], 0.5, [1, 2, 5])
    expect(takeHanging('work', [0, 2, 3], 0.5)).toBeUndefined()
    expect(takeHanging('work', [1, 2, 3], 0.4)).toBeUndefined()
    const taken = takeHanging('work', [1, 2, 3], 0.5)
    expect(taken?.from).toEqual([1, 2, 5])
    expect(takeHanging('work', [1, 2, 3], 0.5)).toBeUndefined()
  })
})
