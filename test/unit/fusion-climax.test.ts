import {expect, test} from 'bun:test'

import {climaxMoment, confluence, impact, reboundTrail, reboundWarp} from '../../src/lib/gallery/fusion/climax.ts'
import {fusionTiming} from '../../src/lib/gallery/fusion/timing.ts'

const success = {
  kind: 'success',
  at: 12,
} as const
test('a fusion is in its climax from its success on and after it once the result flipped out, and in neither before or when it fails', () => {
  expect(climaxMoment(11, success, undefined, fusionTiming)).toEqual({})
  expect(climaxMoment(12 + fusionTiming.climax / 2, success, undefined, fusionTiming).progress).toBeCloseTo(0.5)
  expect(climaxMoment(14, success, 13.5, fusionTiming).after).toBeCloseTo(0.5)
  expect(climaxMoment(14, {
    kind: 'failure',
    at: 12,
  }, undefined, fusionTiming)).toEqual({})
})
test('the warp pulls the room in through the climax, blasts it out as the result flips out and lets go of it again', () => {
  expect(reboundWarp({})).toBeUndefined()
  expect(reboundWarp({progress: 0.9})!.pull).toBeGreaterThan(0.5)
  expect(reboundWarp({after: 0})!.pull).toBeLessThan(0)
  expect(reboundWarp({after: 1.5})).toBeUndefined()
  // The comet trails only wind in during the climax.
  expect(reboundTrail({progress: 0.5}, 3)!.energy).toBeGreaterThan(0)
  expect(reboundTrail({after: 0}, 3)).toBeUndefined()
})
test('the result has crystallized out of the confluence by the time it flips out, which ends the marbling', () => {
  expect(confluence({})).toBeUndefined()
  expect(confluence({progress: 0.3})!.crystal).toBe(0)
  expect(confluence({progress: 1})!.crystal).toBeGreaterThan(1)
  expect(confluence({after: 0.1})!.marble).toBe(0)
})
test('the blow eases off with distance and comes to rest at last', () => {
  const near = impact({after: 0.05}, 2)!
  const far = impact({after: 0.05}, 20)!
  expect(far.shake).toBeGreaterThan(0)
  expect(far.shake).toBeLessThan(near.shake)
  const settled = impact({after: 1.499}, 2)!
  expect(settled.bloom).toBeCloseTo(1)
  expect(settled.shake).toBeCloseTo(0)
  expect(impact({after: 1.5}, 2)).toBeUndefined()
})
