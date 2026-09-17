import type {EgoZoomMode, EgoZoomOptions} from '../src/EgoZoom.ts'

import {expect, spyOn, test} from 'bun:test'

import {OrthographicCamera, PerspectiveCamera} from 'three/webgpu'

import EgoZoom from '../src/EgoZoom.ts'

const options: EgoZoomOptions = {
  casualZoomFactor: 2,
  casualZoomTransition: 0.2,
  extendedZoomFactor: 3,
  extendedZoomTransition: 0.4,
}
const instant: EgoZoomOptions = {
  ...options,
  casualZoomTransition: 0,
  extendedZoomTransition: 0,
}
test('casual zoom eases very slowly at both ends and fastest through the middle in both directions', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  for (const amount of [0.015625, 0.5, 0.984375, 1]) {
    expect(zoom.update(camera, 'casual', options, 0.05)).toBeCloseTo(amount, 10)
    expect(camera.fov).toBeCloseTo(60 - 30 * amount, 10)
  }
  for (const amount of [0.984375, 0.5, 0.015625, 0]) {
    expect(zoom.update(camera, 'none', options, 0.05)).toBeCloseTo(amount, 10)
    expect(camera.fov).toBeCloseTo(60 - 30 * amount, 10)
  }
})
test('entering and leaving extended zoom uses its own duration and the same quintic easing', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  zoom.update(camera, 'casual', options, 0.2)
  expect(camera.fov).toBe(30)
  for (const progress of [0.015625, 0.5, 0.984375, 1]) {
    expect(zoom.update(camera, 'extended', options, 0.1)).toBe(1)
    expect(camera.fov).toBeCloseTo(30 - 10 * progress, 10)
  }
  for (const progress of [0.015625, 0.5, 0.984375, 1]) {
    expect(zoom.update(camera, 'casual', options, 0.1)).toBe(1)
    expect(camera.fov).toBeCloseTo(20 + 10 * progress, 10)
  }
  expect(zoom.update(camera, 'none', options, 0.1)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(45)
  expect(zoom.update(camera, 'none', options, 0.1)).toBe(0)
  expect(camera.fov).toBe(60)
})
test('a direct normal/extended transition uses extended timing in both directions', () => {
  const camera = new PerspectiveCamera(90)
  const zoom = new EgoZoom
  expect(zoom.update(camera, 'extended', options, 0.2)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(60)
  expect(zoom.update(camera, 'extended', options, 0.2)).toBe(1)
  expect(camera.fov).toBe(30)
  expect(zoom.update(camera, 'none', options, 0.2)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(60)
  expect(zoom.update(camera, 'none', options, 0.2)).toBe(0)
  expect(camera.fov).toBe(90)
})
test('interrupted transitions retarget the current FOV and amount without snapping', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  expect(zoom.update(camera, 'casual', options, 0.1)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(45)
  expect(zoom.update(camera, 'extended', options, 0)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(45)
  expect(zoom.update(camera, 'extended', options, 0.2)).toBeCloseTo(0.75)
  expect(camera.fov).toBeCloseTo(32.5)
  expect(zoom.update(camera, 'casual', options, 0)).toBeCloseTo(0.75)
  expect(camera.fov).toBeCloseTo(32.5)
  expect(zoom.update(camera, 'casual', options, 0.2)).toBeCloseTo(0.875)
  expect(camera.fov).toBeCloseTo(31.25)
  expect(zoom.update(camera, 'none', options, 0)).toBeCloseTo(0.875)
  expect(camera.fov).toBeCloseTo(31.25)
  expect(zoom.update(camera, 'none', options, 0.2)).toBe(0)
  expect(camera.fov).toBe(60)
})
test('both factors divide the original FOV rather than compounding across modes', () => {
  const camera = new PerspectiveCamera(90)
  const zoom = new EgoZoom
  const custom = {
    ...instant,
    casualZoomFactor: 3,
    extendedZoomFactor: 6,
  }
  for (let i = 0; i < 10; i++) {
    expect(zoom.update(camera, 'casual', custom, 0)).toBe(1)
    expect(camera.fov).toBe(30)
    expect(zoom.update(camera, 'extended', custom, 0)).toBe(1)
    expect(camera.fov).toBe(15)
    zoom.update(camera, 'casual', custom, 0)
    expect(camera.fov).toBe(30)
    expect(zoom.update(camera, 'none', custom, 0)).toBe(0)
    expect(camera.fov).toBe(90)
  }
})
test('live factor changes retarget without recapturing an already zoomed FOV', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  zoom.update(camera, 'extended', options, 0.4)
  const changed = {
    ...options,
    extendedZoomFactor: 4,
  }
  zoom.update(camera, 'extended', changed, 0)
  expect(camera.fov).toBe(20)
  zoom.update(camera, 'extended', changed, 0.2)
  expect(camera.fov).toBeCloseTo(17.5)
  zoom.update(camera, 'extended', changed, 0.2)
  expect(camera.fov).toBe(15)
  zoom.update(camera, 'none', changed, 0.4)
  expect(camera.fov).toBe(60)
})
test('either transition can independently be instant', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  const instantCasual = {
    ...options,
    casualZoomTransition: 0,
  }
  zoom.update(camera, 'casual', instantCasual, 0)
  expect(camera.fov).toBe(30)
  zoom.update(camera, 'extended', instantCasual, 0.2)
  expect(camera.fov).toBeCloseTo(25)
  zoom.update(camera, 'extended', instantCasual, 0.2)
  expect(camera.fov).toBe(20)
  zoom.update(camera, 'casual', instantCasual, 0.2)
  expect(camera.fov).toBeCloseTo(25)
  zoom.update(camera, 'casual', instantCasual, 0.2)
  expect(camera.fov).toBe(30)
  zoom.update(camera, 'none', instantCasual, 0)
  expect(camera.fov).toBe(60)
  const instantExtended = {
    ...options,
    extendedZoomTransition: 0,
  }
  zoom.update(camera, 'casual', instantExtended, 0.1)
  expect(camera.fov).toBeCloseTo(45)
  zoom.update(camera, 'extended', instantExtended, 0)
  expect(camera.fov).toBe(20)
  zoom.update(camera, 'casual', instantExtended, 0)
  expect(camera.fov).toBe(30)
  zoom.update(camera, 'none', instantExtended, 0.1)
  expect(camera.fov).toBeCloseTo(45)
  zoom.reset()
  zoom.update(camera, 'extended', instantExtended, 0)
  zoom.update(camera, 'none', instantExtended, 0)
  expect(camera.fov).toBe(60)
})
for (const fps of [30, 60, 144, 240]) {
  test(`both zoom modes are frame-rate independent at ${fps} FPS`, () => {
    const camera = new PerspectiveCamera(60)
    const zoom = new EgoZoom
    for (const [mode, fov] of [['casual', 30], ['extended', 20], ['casual', 30], ['none', 60]] as const) {
      for (let i = 0; i < fps; i++) {
        zoom.update(camera, mode, options, 1 / fps)
      }
      expect(camera.fov).toBe(fov)
    }
  })
}
test('reset releases any zoom immediately but preserves another camera owner’s writes', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  zoom.update(camera, 'extended', options, 0.2)
  expect(camera.fov).toBe(40)
  expect(zoom.reset()).toBe(0)
  expect(camera.fov).toBe(60)
  zoom.update(camera, 'none', options, 1)
  expect(camera.fov).toBe(60)
  zoom.update(camera, 'extended', instant, 0)
  camera.fov = 45
  zoom.reset()
  expect(camera.fov).toBe(45)
  zoom.update(camera, 'extended', instant, 0)
  expect(camera.fov).toBe(15)
  const next = new PerspectiveCamera(60)
  zoom.update(next, 'casual', instant, 0)
  expect(camera.fov).toBe(45)
  expect(next.fov).toBe(30)
  zoom.reset()
  zoom.reset()
  expect(next.fov).toBe(60)
})
test('external FOV edits and orthographic camera switches release stale zoom ownership', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  zoom.update(camera, 'extended', instant, 0)
  camera.fov = 75
  zoom.update(camera, 'extended', instant, 0)
  expect(camera.fov).toBe(25)
  expect(zoom.update(new OrthographicCamera, 'extended', instant, 0)).toBe(0)
  expect(camera.fov).toBe(75)
})
test('invalid frame deltas do not advance or poison either zoom transition', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  for (const mode of ['casual', 'extended'] satisfies Array<EgoZoomMode>) {
    zoom.reset()
    for (const delta of [0, -1, Number.NaN, Infinity]) {
      expect(zoom.update(camera, mode, options, delta)).toBe(0)
      expect(camera.fov).toBe(60)
    }
    expect(zoom.update(camera, mode, options, 1)).toBe(1)
    expect(camera.fov).toBe(mode === 'casual' ? 30 : 20)
  }
})
test('settled modes do not repeatedly update the projection matrix', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  const projection = spyOn(camera, 'updateProjectionMatrix')
  try {
    for (const mode of ['none', 'casual', 'extended', 'casual', 'none'] satisfies Array<EgoZoomMode>) {
      zoom.update(camera, mode, instant, 0)
      const writes = projection.mock.calls.length
      for (let i = 0; i < 60; i++) {
        zoom.update(camera, mode, instant, 1 / 60)
      }
      expect(projection).toHaveBeenCalledTimes(writes)
    }
  } finally {
    projection.mockRestore()
  }
})
test('transition notifications follow FOV direction and duration, never repeat on held frames', () => {
  const camera = new PerspectiveCamera(60)
  const zoom = new EgoZoom
  const events: Array<unknown> = []
  const report = (event: unknown) => events.push(event)
  const timings = {
    casualZoomFactor: 2,
    extendedZoomFactor: 3,
    casualZoomTransition: 0.2,
    extendedZoomTransition: 0.4,
  }
  zoom.update(camera, 'casual', timings, 0.05, report)
  zoom.update(camera, 'casual', timings, 0.05, report)
  expect(events).toEqual([{
    from: 'none',
    to: 'casual',
    direction: 'forward',
    duration: 0.2,
  }])
  zoom.update(camera, 'extended', timings, 0.4, report)
  zoom.update(camera, 'casual', timings, 0.1, report)
  expect(events.at(-1)).toEqual({
    from: 'extended',
    to: 'casual',
    direction: 'retract',
    duration: 0.4,
  })
  zoom.update(camera, 'extended', timings, 0, report)
  expect(events.at(-1)).toEqual({
    from: 'casual',
    to: 'extended',
    direction: 'forward',
    duration: 0.4,
  })
  zoom.update(camera, 'none', timings, 0.4, report)
  expect(events.at(-1)).toEqual({
    from: 'extended',
    to: 'none',
    direction: 'retract',
    duration: 0.4,
  })
  const count = events.length
  zoom.update(camera, 'none', timings, 1, report)
  zoom.reset()
  expect(events).toHaveLength(count)
})
