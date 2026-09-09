import {expect, test} from 'bun:test'

import {EgoView} from '../src/EgoView.ts'
import {defaultEgoOptions} from '../src/options.ts'

test('camera height is feet-relative and crouching eases toward its target', () => {
  const view = new EgoView(1.6)
  const result = view.update(1 / 60, 0, true, true, defaultEgoOptions)
  expect(result.offset).toBeLessThan(1.6)
  expect(result.offset).toBeGreaterThan(0.9)
  for (let i = 0; i < 120; i++) {
    view.update(1 / 60, 0, true, true, defaultEgoOptions)
  }
  expect(view.height).toBeCloseTo(0.9)
})
test('stride callbacks are frame-rate independent and do not require visible bob', () => {
  for (const fps of [30, 60, 144, 240]) {
    const view = new EgoView(1.6)
    let steps = 0
    for (let i = 0; i < fps * 10; i++) {
      const result = view.update(1 / fps, defaultEgoOptions.speed, true, false, {
        ...defaultEgoOptions,
        bobStrength: 0,
      })
      steps += Number(result.stepped)
      expect(result.offset).toBe(1.6)
    }
    expect(steps).toBe(18)
  }
})
test('stationary and airborne movement never produce footsteps', () => {
  const view = new EgoView(1.6)
  for (let i = 0; i < 120; i++) {
    expect(view.update(1 / 60, 0, true, false, defaultEgoOptions).stepped).toBe(false)
    expect(view.update(1 / 60, 3, false, false, defaultEgoOptions).stepped).toBe(false)
  }
})
test('reset clears stride phase and immediately restores eye height', () => {
  const view = new EgoView(0.9)
  for (let i = 0; i < 20; i++) {
    view.update(1 / 60, defaultEgoOptions.speed, true, true, defaultEgoOptions)
  }
  view.reset(1.6)
  expect(view.height).toBe(1.6)
  expect(view.update(1 / 60, 0, true, false, defaultEgoOptions)).toEqual({
    offset: 1.6,
    stepped: false,
  })
})
test('invalid frame deltas do not poison the camera', () => {
  const view = new EgoView(1.6)
  for (const delta of [0, -1, Infinity, Number.NaN]) {
    expect(view.update(delta, 3, true, true, defaultEgoOptions)).toEqual({
      offset: 1.6,
      stepped: false,
    })
  }
})
