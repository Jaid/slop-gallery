import {describe, expect, test} from 'bun:test'

import {Euler, Quaternion} from 'three/webgpu'

import {InspectionLook} from '../../src/lib/camera/InspectionLook.ts'

const rotation = (yaw = 0, pitch = 0) => (new Quaternion).setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'))
describe('inspection look', () => {
  test('buffers mouse changes without exposing raw camera jumps', () => {
    const look = new InspectionLook(rotation())
    look.addInput(0.3, 0)
    expect(look.rotation.angleTo(rotation())).toBeLessThan(0.000_001)
    const next = look.update(rotation(), 1 / 60).clone()
    expect(next.angleTo(rotation())).toBeGreaterThan(0)
    expect(next.angleTo(rotation())).toBeLessThan(0.1)
    for (let i = 0; i < 240; i++) {
      look.update(rotation(), 1 / 60)
    }
    expect(look.rotation.angleTo(rotation())).toBeLessThan(0.000_001)
  })
  test('increases the fraction pulled back as angular distance grows', () => {
    for (const axis of ['yaw', 'pitch']) {
      let previousFraction = 0
      for (const distance of [0.05, 0.2, 0.5, 1]) {
        const look = new InspectionLook(axis === 'yaw' ? rotation(distance) : rotation(0, distance))
        const remaining = look.update(rotation(), 1 / 60).angleTo(rotation())
        const fraction = (distance - remaining) / distance
        expect(fraction).toBeGreaterThan(previousFraction)
        expect(remaining).toBeGreaterThan(0)
        previousFraction = fraction
      }
    }
  })
  test('resists harder input progressively rather than allowing proportional drift', () => {
    const offsets = [0.01, 0.02, 0.04, 0.08].map(input => {
      const look = new InspectionLook(rotation())
      for (let i = 0; i < 240; i++) {
        look.addInput(input, 0)
        look.update(rotation(), 1 / 60)
      }
      return look.rotation.angleTo(rotation())
    })
    let previousRatio = 2
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1])
      const ratio = offsets[i] / offsets[i - 1]
      expect(ratio).toBeLessThan(previousRatio)
      previousRatio = ratio
    }
    expect(offsets.at(-1)!).toBeLessThan(0.3)
  })
  test('accumulates multiple mouse events before the next frame', () => {
    const one = new InspectionLook(rotation())
    const many = new InspectionLook(rotation())
    one.addInput(0.3, 0)
    for (let i = 0; i < 10; i++) {
      many.addInput(0.03, 0)
    }
    expect(one.update(rotation(), 1 / 60).angleTo(many.update(rotation(), 1 / 60))).toBeLessThan(0.000_001)
  })
  test('keeps settling consistent across refresh rates', () => {
    const results = [30, 60, 144, 240].map(fps => {
      const look = new InspectionLook(rotation(0.6, 0.2))
      for (let i = 0; i < fps; i++) {
        look.update(rotation(), 1 / fps)
      }
      return look.rotation
    })
    for (const result of results) {
      expect(result.angleTo(results[0])).toBeLessThan(0.0001)
    }
  })
  test('handles yaw wrapping and sustained resistance without invalid rotations', () => {
    const target = rotation(Math.PI - 0.01)
    const look = new InspectionLook(target)
    for (let i = 0; i < 600; i++) {
      look.addInput(0.04, 0.01)
      look.update(target, 1 / 60)
      expect(look.rotation.length()).toBeCloseTo(1, 10)
    }
    expect(look.rotation.angleTo(target)).toBeGreaterThan(0.1)
    expect(look.rotation.angleTo(target)).toBeLessThan(0.5)
    for (let i = 0; i < 240; i++) {
      look.update(target, 1 / 60)
    }
    expect(look.rotation.angleTo(target)).toBeLessThan(0.000_001)
  })
  test('returns monotonically even from a nearly opposite heading', () => {
    for (const yaw of [-3, -1, -0.1, 0.1, 1, 3]) {
      const look = new InspectionLook(rotation(yaw))
      let previous = Math.abs(yaw)
      for (let i = 0; i < 240; i++) {
        look.update(rotation(), 1 / 60)
        const current = (new Euler).setFromQuaternion(look.rotation, 'YXZ').y * Math.sign(yaw)
        expect(current).toBeGreaterThanOrEqual(0)
        expect(current).toBeLessThanOrEqual(previous)
        previous = current
      }
      expect(previous).toBeLessThan(0.000_001)
    }
  })
  test('has the same driven response at different refresh rates', () => {
    const results = [30, 60, 144, 240].map(fps => {
      const look = new InspectionLook(rotation())
      for (let i = 0; i < fps / 2; i++) {
        look.addInput(2.4 / fps, 0)
        look.update(rotation(), 1 / fps)
      }
      return look.rotation
    })
    for (const result of results) {
      expect(result.angleTo(results[0])).toBeLessThan(0.0001)
    }
  })
  test('filters uneven input batches instead of producing frame-to-frame jumps', () => {
    const look = new InspectionLook(rotation())
    let minimum = Infinity
    let maximum = -Infinity
    for (let i = 0; i < 180; i++) {
      look.addInput(i % 2 ? 0 : 0.08, 0)
      look.update(rotation(), 1 / 60)
      if (i >= 60) {
        const yaw = (new Euler).setFromQuaternion(look.rotation, 'YXZ').y
        minimum = Math.min(minimum, yaw)
        maximum = Math.max(maximum, yaw)
      }
    }
    expect(maximum - minimum).toBeLessThan(0.001)
  })
  test('bounds extreme alternating swipes without winding up or flipping', () => {
    const look = new InspectionLook(rotation())
    const previous = look.rotation.clone()
    for (let i = 0; i < 600; i++) {
      look.addInput(i % 2 ? 100 : -100, i % 2 ? 100 : -100)
      look.update(rotation(), 1 / 60)
      expect(look.rotation.angleTo(previous)).toBeLessThan(0.02)
      expect(look.rotation.angleTo(rotation())).toBeLessThan(0.04)
      expect(look.rotation.length()).toBeCloseTo(1, 10)
      previous.copy(look.rotation)
    }
    for (let i = 0; i < 120; i++) {
      look.update(rotation(), 1 / 60)
    }
    expect(look.rotation.angleTo(rotation())).toBeLessThan(0.000_001)
  })
  test('keeps pitch inside the poles and ignores nonfinite input', () => {
    const look = new InspectionLook(rotation(0, Math.PI / 2 - 0.001))
    const target = look.rotation.clone()
    for (let i = 0; i < 120; i++) {
      look.addInput(0, 1)
      look.addInput(Number.NaN, Infinity)
      look.update(target, 1 / 60)
      const angles = (new Euler).setFromQuaternion(look.rotation, 'YXZ')
      expect(angles.x).toBeGreaterThan(1.5)
      expect(angles.x).toBeLessThanOrEqual(Math.PI / 2)
      expect(Math.abs(angles.y)).toBeLessThan(0.000_001)
    }
  })
  test('supports return targets and invalid frame durations', () => {
    const look = new InspectionLook(rotation())
    for (const delta of [0, -1, Number.NaN, Infinity]) {
      expect(look.update(rotation(1), delta).angleTo(rotation())).toBeLessThan(0.000_001)
    }
    const bounded = new InspectionLook(rotation()).update(rotation(1), 0.06)
    expect(look.update(rotation(1), 5).angleTo(bounded)).toBeLessThan(0.000_001)
    look.addInput(-1, 0)
    expect(look.update(rotation(0.4), 1 / 60).angleTo(rotation(0.4))).toBeGreaterThan(0.000_001)
    for (let i = 0; i < 240; i++) {
      look.update(rotation(0.4), 1 / 60)
    }
    expect(look.update(rotation(0.4), 1 / 60).angleTo(rotation(0.4))).toBeLessThan(0.000_001)
  })
})
