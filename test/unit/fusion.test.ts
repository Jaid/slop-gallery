import type {SatelliteOrbit, SatellitePose} from '../../src/lib/gallery/fusion/orbit.ts'

import {describe, expect, test} from 'bun:test'

import {Quaternion, Vector3} from 'three/webgpu'

import {portalEnvelope} from '../../src/lib/gallery/fusion/envelope.ts'
import Fusion from '../../src/lib/gallery/fusion/Fusion.ts'
import {orbitPoint, satellitePose} from '../../src/lib/gallery/fusion/orbit.ts'
import {portalFrame, satelliteSize} from '../../src/lib/gallery/fusion/portalFrame.ts'
import {fusionTiming, ingredientAt} from '../../src/lib/gallery/fusion/timing.ts'

const work = {
  id: 'work',
  position: [2, 2.4, -5] as [number, number, number],
  rotation: Math.PI / 2,
  width: 1.2,
  height: 1.6,
}
const surroundings = {
  floor: 0,
  room: 8,
  sides: [6, 6] as const,
}
const frame = portalFrame(work, surroundings)
const pose = (): SatellitePose => ({
  position: new Vector3,
  quaternion: new Quaternion,
  scale: 1,
})
const wallSide = (point: Vector3) => (point.x - work.position[0]) * frame.normal[0] + (point.z - work.position[2]) * frame.normal[2]
describe('portal frame', () => {
  test('the portal floats in front of its work at about eye height, facing out of the wall', () => {
    expect(frame.normal[0]).toBeCloseTo(1)
    expect(frame.normal[2]).toBeCloseTo(0)
    expect(frame.center[0] - work.position[0]).toBeGreaterThan(0.9)
    expect(frame.center[1]).toBeGreaterThanOrEqual(1.55)
    expect(frame.center[1]).toBeLessThanOrEqual(2.05)
    const dot = frame.normal[0] * frame.tangent[0] + frame.normal[2] * frame.tangent[2]
    expect(dot).toBeCloseTo(0)
  })
  test('the orbit narrows beside a corner and stays clear of the wall behind the work', () => {
    const cornered = portalFrame(work, {
      ...surroundings,
      sides: [1.6, 6],
    })
    expect(cornered.orbit.along).toBeLessThan(frame.orbit.along)
    expect(cornered.orbit.along + satelliteSize / 2).toBeLessThan(1.6)
    const cramped = portalFrame(work, {
      ...surroundings,
      room: 2.2,
    })
    for (const each of [frame, cramped]) {
      const point = orbitPoint(each, -Math.PI / 2, 1, new Vector3)
      expect(wallSide(point)).toBeGreaterThan(satelliteSize / 2)
    }
  })
})
describe('timeline', () => {
  test('opening the portal and showing both ingredients once takes exactly the minimum', () => {
    expect(fusionTiming.gather + 2 * fusionTiming.ingredient).toBeCloseTo(fusionTiming.minimum)
  })
  test('the ingredients surface one after another, over and over', () => {
    expect(ingredientAt(0.5, 2)).toBeUndefined()
    const {gather, ingredient} = fusionTiming
    expect(ingredientAt(gather + ingredient / 2, 2)).toEqual({
      index: 0,
      turn: 0,
      clarity: 1,
    })
    expect(ingredientAt(gather + ingredient * 1.5, 2)).toMatchObject({
      index: 1,
      turn: 1,
      clarity: 1,
    })
    expect(ingredientAt(gather + ingredient * 2.5, 2)).toMatchObject({
      index: 0,
      turn: 2,
    })
    expect(ingredientAt(gather + 0.001, 2)!.clarity).toBeLessThan(0.05)
  })
  test('the portal opens, closes after the result is out and dies down when it fizzles', () => {
    expect(portalEnvelope(0, undefined, undefined, fusionTiming, 2).size).toBe(0)
    expect(portalEnvelope(fusionTiming.gather, undefined, undefined, fusionTiming, 2).size).toBeCloseTo(1, 1)
    // It swells while an ingredient shows.
    expect(portalEnvelope(fusionTiming.gather + fusionTiming.ingredient / 2, undefined, undefined, fusionTiming, 2).size).toBeGreaterThan(1.1)
    const success = {
      kind: 'success' as const,
      at: 5,
    }
    const climax = portalEnvelope(5 + fusionTiming.climax / 2, success, undefined, fusionTiming, 2)
    expect(climax.image).toMatchObject({result: true})
    const emergedAt = 5 + fusionTiming.climax
    expect(portalEnvelope(emergedAt, success, emergedAt, fusionTiming, 2).flash).toBeGreaterThan(0.8)
    expect(portalEnvelope(emergedAt + fusionTiming.afterglow, success, emergedAt, fusionTiming, 2).size).toBe(0)
    const failure = {
      kind: 'failure' as const,
      at: 4,
    }
    const fizzled = portalEnvelope(4 + fusionTiming.fizzle, failure, undefined, fusionTiming, 2)
    expect(fizzled.size).toBe(0)
    expect(fizzled.embers).toBe(1)
  })
})
describe('orbit', () => {
  const facing = new Quaternion
  const start = {
    position: new Vector3(...work.position),
    quaternion: facing.setFromAxisAngle(new Vector3(0, 1, 0), work.rotation),
  }
  const satellite: SatelliteOrbit = {
    phase: -2.3,
    scale: 0.5,
    start,
    home: start,
  }
  test('a work flies from its wall into orbit, shrinking, and circles clear of the wall and the floor', () => {
    const first = satellitePose(frame, fusionTiming, satellite, 0, undefined, pose())
    expect(first.position.distanceTo(start.position)).toBeLessThan(1e-9)
    expect(first.scale).toBe(1)
    for (let elapsed = fusionTiming.gather; elapsed < 12; elapsed += 0.05) {
      const {position, scale} = satellitePose(frame, fusionTiming, satellite, elapsed, undefined, pose())
      expect(scale).toBe(0.5)
      expect(wallSide(position)).toBeGreaterThan(satelliteSize / 2)
      expect(position.y - satelliteSize / 2).toBeGreaterThan(0.4)
    }
  })
  test('on success, it spirals into the portal’s middle and vanishes', () => {
    const outcome = {
      kind: 'success' as const,
      at: 6,
    }
    const end = satellitePose(frame, fusionTiming, satellite, outcome.at + fusionTiming.climax, outcome, pose())
    expect(end.scale).toBe(0)
    expect(end.position.distanceTo(new Vector3(...frame.center))).toBeLessThan(1e-9)
  })
  test('on failure, the work flies back to its wall at full size', () => {
    const outcome = {
      kind: 'failure' as const,
      at: 6,
    }
    const end = satellitePose(frame, fusionTiming, satellite, outcome.at + fusionTiming.fizzle, outcome, pose())
    expect(end.scale).toBe(1)
    expect(end.position.distanceTo(start.position)).toBeLessThan(1e-9)
    expect(end.quaternion.angleTo(start.quaternion)).toBeLessThan(1e-6)
  })
})
const spec = () => ({
  work,
  partner: {
    kind: 'prop' as const,
    id: 'prop',
  },
  ingredients: ['work.jxl'],
})
describe('fusion', () => {
  const timing = {
    gather: 0.01,
    ingredient: 0.02,
    minimum: 0.08,
    climax: 0.04,
    afterglow: 0.03,
    fizzle: 0.04,
  }
  test('a result waits for the minimum, holds its image ready and lets go of it once the portal closes', async () => {
    let released = 0
    let closed = 0
    const fusion = new Fusion(spec(), {
      frame,
      timing,
      hold: () => ({
        ready: Promise.resolve(),
        release: () => released++,
      }),
      onClose: () => closed++,
    })
    await fusion.succeed(new Blob(['result']))
    expect(fusion.elapsed()).toBeGreaterThanOrEqual(timing.minimum + timing.climax)
    fusion.emerge()
    fusion.finish()
    expect(fusion.closed).toBe(false)
    await new Promise(resolve => setTimeout(resolve, (timing.afterglow + 0.1) * 1000))
    expect(fusion.closed).toBe(true)
    expect(closed).toBe(1)
    expect(released).toBe(1)
  })
  test('aborting ends a fusion at once, and only once', async () => {
    let closed = 0
    const fusion = new Fusion(spec(), {
      frame,
      timing,
      onClose: () => closed++,
    })
    const failing = fusion.fail()
    fusion.abort()
    await failing
    fusion.finish()
    expect(fusion.closed).toBe(true)
    expect(closed).toBe(1)
    expect(fusion.elapsed()).toBeLessThan(timing.minimum)
    fusion.addIngredient('late.jxl')
    expect(fusion.spec.ingredients).toEqual(['work.jxl'])
  })
})
