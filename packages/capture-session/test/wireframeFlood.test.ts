import {describe, expect, test} from 'bun:test'

import {advanceWireframeFlood, applyWireframeFlood, wireframeFlood} from '../src/wireframeFlood.ts'

// The flood is one live object, so the steps build on each other.
describe('wireframe flood', () => {
  test('starts disabled, flooding in', () => {
    expect(wireframeFlood).toMatchObject({
      enabled: false,
      direction: 'in',
      radius: 0,
      speed: null,
    })
  })
  test('a first direction turns the flood on and grows it from 0 by its speed', () => {
    expect(applyWireframeFlood({
      direction: 'in',
      speed: 10,
    }, 1)).toMatchObject({
      enabled: true,
      radius: 0,
    })
    advanceWireframeFlood(1.5)
    expect(wireframeFlood.radius).toBeCloseTo(5)
  })
  test('the same fields sent again keep the flood growing', () => {
    applyWireframeFlood({
      direction: 'in',
      speed: 10,
    }, 1.5)
    advanceWireframeFlood(2)
    expect(wireframeFlood.radius).toBeCloseTo(10)
  })
  test('a new speed goes on from the current radius', () => {
    applyWireframeFlood({speed: 2}, 2)
    advanceWireframeFlood(3)
    expect(wireframeFlood.radius).toBeCloseTo(12)
  })
  test('a new direction starts over from 0, or from the radius sent along', () => {
    applyWireframeFlood({direction: 'out'}, 3)
    advanceWireframeFlood(3)
    expect(wireframeFlood.radius).toBe(0)
    advanceWireframeFlood(4)
    expect(wireframeFlood.radius).toBeCloseTo(2)
    applyWireframeFlood({
      direction: 'in',
      radius: 1,
      enabled: false,
    }, 4)
    advanceWireframeFlood(5)
    expect(wireframeFlood.radius).toBeCloseTo(3)
    expect(wireframeFlood.enabled).toBe(false)
  })
  test('a burst above 1 starts faster than the speed and approaches it', () => {
    applyWireframeFlood({
      direction: 'out',
      speed: 1,
      burst: 3,
      burstDuration: 0.5,
      enabled: true,
    }, 10)
    advanceWireframeFlood(10.01)
    expect(wireframeFlood.radius / 0.01).toBeCloseTo(3, 1)
    advanceWireframeFlood(20)
    expect(wireframeFlood.radius).toBeCloseTo(11)
  })
})
