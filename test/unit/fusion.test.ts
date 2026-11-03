import type {SatelliteOrbit, SatellitePose} from '../../src/lib/gallery/fusion/orbit.ts'

import {describe, expect, test} from 'bun:test'

import {Quaternion, Vector3} from 'three/webgpu'

import {brewing, portalEnvelope} from '../../src/lib/gallery/fusion/envelope.ts'
import Fusion from '../../src/lib/gallery/fusion/Fusion.ts'
import {beats, choreographed, grabs, introSeconds, introTether, introTrail, release, whirl, whirled, whirling} from '../../src/lib/gallery/fusion/intro.ts'
import {introOrbitRate, orbitPoint, orbitSpeed, satellitePose} from '../../src/lib/gallery/fusion/orbit.ts'
import {portalFrame, portalRebound, satelliteSize, touchesPortal} from '../../src/lib/gallery/fusion/portalFrame.ts'
import {fusionTiming, imageAt, introTurns, nextTurn} from '../../src/lib/gallery/fusion/timing.ts'

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
  test('the intro fills the minimum', () => {
    expect(fusionTiming.intro).toBe(fusionTiming.minimum)
  })
  test('after the intro, the images surface one after another, over and over', () => {
    const {intro: introEnd, image} = fusionTiming
    expect(imageAt(introEnd - 0.1, 2)).toBeUndefined()
    expect(imageAt(introEnd + image / 2, 2)).toEqual({
      index: 0,
      turn: introTurns,
      clarity: 1,
    })
    expect(imageAt(introEnd + image * 1.5, 2)).toMatchObject({
      index: 1,
      turn: introTurns + 1,
      clarity: 1,
    })
    expect(imageAt(introEnd + 0.001, 2)!.clarity).toBeLessThan(0.05)
  })
  test('the portal brews after its intro, closes after the result is out and dies down when it fizzles', () => {
    // It swells while an image shows.
    expect(portalEnvelope(fusionTiming.intro + fusionTiming.image / 2, undefined, undefined, fusionTiming, 2).size).toBeGreaterThan(1.1)
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
    index: 0,
    phase: -2.3,
    scale: 0.5,
    start,
    home: start,
  }
  test('after the intro, a work circles clear of the wall and the floor', () => {
    for (let elapsed = fusionTiming.intro; elapsed < 12; elapsed += 0.05) {
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
describe('intro', () => {
  const facing = new Quaternion
  facing.setFromAxisAngle(new Vector3(0, 1, 0), work.rotation)
  const satellites: Array<SatelliteOrbit> = [{
    index: 0,
    phase: -Math.PI / 2 - 0.7,
    scale: 0.5,
    start: {
      position: new Vector3(...work.position),
      quaternion: facing,
    },
    home: {
      position: new Vector3(...work.position),
      quaternion: facing,
    },
  }, {
    index: 1,
    phase: Math.PI / 2 - 0.7,
    scale: 0.7,
    start: {
      position: new Vector3(work.position[0] + 0.6, work.position[1] - 0.3, work.position[2] + 0.8),
      quaternion: new Quaternion,
    },
    tumble: new Vector3(0.6, 0.8, 0),
  }]
  const end = fusionTiming.intro
  const just = end - 1e-4
  test('starts from where everything was seized and hands it over to the orbit where the loop picks it up', () => {
    for (const satellite of satellites) {
      const first = satellitePose(frame, fusionTiming, satellite, 0, undefined, pose())
      expect(first.position.distanceTo(satellite.start.position)).toBeLessThan(1e-6)
      expect(first.quaternion.angleTo(satellite.start.quaternion)).toBeLessThan(1e-6)
      expect(first.scale).toBeCloseTo(1, 6)
      const before = satellitePose(frame, fusionTiming, satellite, just, undefined, pose())
      const after = satellitePose(frame, fusionTiming, satellite, end, undefined, pose())
      expect(before.position.distanceTo(after.position)).toBeLessThan(0.01)
      expect(before.quaternion.angleTo(after.quaternion)).toBeLessThan(0.01)
      expect(before.scale).toBeCloseTo(after.scale, 2)
    }
  })
  test('keeps everything above the floor, clear of the wall while it whirls and moving smoothly', () => {
    const setOff = introSeconds(beats[2], fusionTiming)
    for (const satellite of satellites) {
      let last: Vector3 | undefined
      for (let elapsed = 0; elapsed < end + 0.5; elapsed += 1 / 120) {
        const {position, scale} = satellitePose(frame, fusionTiming, satellite, elapsed, undefined, pose())
        expect(Number.isFinite(position.x + position.y + position.z + scale)).toBe(true)
        expect(position.y).toBeGreaterThan(0.3)
        if (elapsed >= setOff) {
          expect(wallSide(position)).toBeGreaterThan(0.1)
        }
        // A yank may be quick, but nothing jumps faster than 24 m/s between frames.
        if (last) {
          expect(position.distanceTo(last)).toBeLessThan(0.2)
        }
        last = position.clone()
      }
    }
  })
  test('shows each image once, then settles into the brewing portal', () => {
    const shown = new Map<number, number>
    for (let elapsed = 0; elapsed < end; elapsed += 0.01) {
      const {image} = portalEnvelope(elapsed, undefined, undefined, fusionTiming, 2)
      if (!(image && 'index' in image && image.clarity > 0.9)) {
        continue
      }
      expect(image.turn).toBe(image.index)
      shown.set(image.index, (shown.get(image.index) ?? 0) + 1)
    }
    expect(shown.keys().toArray().toSorted((a, b) => a - b)).toEqual([0, 1])
    const last = portalEnvelope(just, undefined, undefined, fusionTiming, 2)
    const brewed = brewing(end, fusionTiming, 2)
    for (const key of ['size', 'energy', 'lens', 'spin'] as const) {
      expect(Math.abs(last[key] - brewed[key])).toBeLessThan(0.05)
    }
    expect(portalEnvelope(0, undefined, undefined, fusionTiming, 2).size).toBeLessThan(0.1)
  })
  test('whirls both an extra lap on tethers from the last beat on, lets go of them at full speed and sets both circling freely', () => {
    expect(whirled(whirl)).toBe(0)
    expect(whirling(release)).toBeCloseTo(1, 9)
    expect(whirled(choreographed)).toBeCloseTo(Math.PI * 2, 9)
    expect(whirled(choreographed + 1)).toBeCloseTo(Math.PI * 2, 9)
    let angle = 0
    for (let t = whirl; t < choreographed + 0.5; t += 0.005) {
      expect(whirled(t)).toBeGreaterThanOrEqual(angle)
      angle = whirled(t)
    }
    for (const index of [0, 1]) {
      expect(introTether(index, introSeconds(grabs[index], fusionTiming) - 1e-3, fusionTiming)).toBeUndefined()
      expect(introTether(index, introSeconds(grabs[index] + 0.1, fusionTiming), fusionTiming)?.reach).toBeCloseTo(1, 6)
      expect(introTether(index, introSeconds(release + 0.1, fusionTiming), fusionTiming)).toBeUndefined()
      expect(introTether(index, end + 3, fusionTiming)).toBeUndefined()
    }
    expect(introOrbitRate(introSeconds(release, fusionTiming), fusionTiming)).toBeGreaterThan(orbitSpeed * 4)
    expect(Math.abs(introOrbitRate(just, fusionTiming) - orbitSpeed)).toBeLessThan(0.3)
  })
  test('the ring of fire left behind falls into the portal and lands as the intro ends, with a blaze', () => {
    for (const index of [0, 1]) {
      expect(introTrail(index, introSeconds(whirl, fusionTiming) - 1e-3, fusionTiming)).toBeUndefined()
      let reach = 1
      for (let elapsed = introSeconds(release, fusionTiming); elapsed < end; elapsed += 0.01) {
        const blazing = introTrail(index, elapsed, fusionTiming)!
        expect(blazing.reach).toBeLessThanOrEqual(reach)
        reach = blazing.reach
      }
      expect(introTrail(index, just, fusionTiming)!.reach).toBeLessThan(0.01)
      expect(introTrail(index, end, fusionTiming)).toBeUndefined()
    }
    const landing = portalEnvelope(end, undefined, undefined, fusionTiming, 2)
    expect(landing.flash).toBeGreaterThan(1)
    expect(landing.burst).toBe(0)
    expect(landing.burstStrength).toBeGreaterThan(1)
    expect(portalEnvelope(end + 2, undefined, undefined, fusionTiming, 2).flash).toBeLessThan(0.01)
  })
})
const spec = () => ({
  work,
  partner: {
    kind: 'item' as const,
    id: 'prop',
  },
  images: ['work.jxl'],
})
describe('fusion', () => {
  const timing = {
    intro: 0.08,
    image: 0.02,
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
    fusion.addImage('late.jxl')
    expect(fusion.spec.images).toEqual(['work.jxl'])
  })
  test('breaking it off aborts its signal at once and fails it as the next turn of the images begins, which fail() then waits for', async () => {
    const fusion = new Fusion(spec(), {
      frame,
      timing,
    })
    await new Promise(resolve => setTimeout(resolve, (timing.intro + timing.image * 1.4) * 1000))
    expect(fusion.cancel()).toBe(true)
    expect(fusion.signal.aborted).toBe(true)
    expect(fusion.canceledAt).toBeGreaterThan(timing.intro + timing.image)
    expect(fusion.outcome?.kind).toBe('failure')
    expect(fusion.outcome!.at).toBeCloseTo(timing.intro + timing.image * Math.ceil((fusion.canceledAt! - timing.intro) / timing.image), 9)
    expect(fusion.cancel()).toBe(false)
    await fusion.fail()
    expect(fusion.closed).toBe(true)
    expect(fusion.elapsed()).toBeGreaterThanOrEqual(fusion.outcome!.at + timing.fizzle)
  })
  test('once its outcome is in, it can no longer be broken off', async () => {
    const fusion = new Fusion(spec(), {
      frame,
      timing,
    })
    const job = fusion.succeed(new Blob(['result']))
    expect(fusion.cancel()).toBe(false)
    expect(fusion.signal.aborted).toBe(false)
    await job
    expect(fusion.outcome?.kind).toBe('success')
    fusion.abort()
  })
})
describe('breaking off', () => {
  test('waits for the end of the intro, then for the next turn of the images', () => {
    const {intro, image} = fusionTiming
    expect(nextTurn(0.5)).toBe(intro)
    expect(nextTurn(intro)).toBe(intro)
    expect(nextTurn(intro + 0.1)).toBeCloseTo(intro + image, 9)
    expect(nextTurn(intro + image * 2.5)).toBeCloseTo(intro + image * 3, 9)
  })
  test('makes the portal recoil at once with a blaze, a shockwave and sparks, then flicker on charred until it fizzles', () => {
    const elapsed = fusionTiming.intro + fusionTiming.image * 0.6
    const failure = {
      kind: 'failure' as const,
      at: nextTurn(elapsed),
    }
    const calm = portalEnvelope(elapsed, failure, undefined, fusionTiming, 2)
    const recoil = portalEnvelope(elapsed, failure, undefined, fusionTiming, 2, elapsed)
    expect(recoil.flash).toBeGreaterThan(1)
    expect(recoil.pulse).toBe(0)
    expect(recoil.pulseStrength).toBeGreaterThan(1.5)
    expect(recoil.burst).toBe(0)
    expect(recoil.embers).toBeGreaterThan(0.5)
    expect(recoil.light).toBeGreaterThan(calm.light + 50)
    const charred = portalEnvelope(elapsed + 0.55, failure, undefined, fusionTiming, 2, elapsed)
    expect(elapsed + 0.55).toBeLessThan(failure.at)
    expect(charred.flash).toBeLessThan(0.01)
    expect(charred.embers).toBeCloseTo(0.3, 1)
    // Before it was broken off, nothing changes.
    expect(portalEnvelope(elapsed - 0.1, failure, undefined, fusionTiming, 2, elapsed)).toEqual(portalEnvelope(elapsed - 0.1, failure, undefined, fusionTiming, 2))
    expect(portalEnvelope(failure.at + fusionTiming.fizzle, failure, undefined, fusionTiming, 2, elapsed).size).toBe(0)
  })
  test('a body reaches into the portal when its capsule comes within the disc', () => {
    const [x, y, z] = frame.center
    const body = (center: [number, number, number], height = 1.7) => touchesPortal(frame, {
      center,
      height,
      radius: 0.3,
    })
    // Standing right under a portal at its highest, the head just reaches it; jumping, the body does from the side too.
    expect(frame.center[1]).toBe(2.05)
    expect(body([x, 0.85, z])).toBe(true)
    expect(body([x, y - 1, z])).toBe(true)
    expect(body([x + 0.7, y, z])).toBe(true)
    expect(body([x + 0.75, y, z])).toBe(false)
    expect(body([x, y - 1.6, z])).toBe(false)
    expect(body([x, y - 1, z + 1])).toBe(false)
  })
  test('throws the body back the way it jumped in, as fast as it came within bounds, with a hop', () => {
    const [x, y, z] = frame.center
    const rebound = (center: [number, number, number], velocity: [number, number, number]) => portalRebound(frame, {
      center,
      velocity,
    })
    // A walking jump straight at it from the room comes back faster than it went in.
    const walked = rebound([x + 0.6, y - 0.4, z], [-3, 2, 0])
    expect(walked[0]).toBeCloseTo(5)
    expect(walked[1]).toBe(3)
    expect(walked[2]).toBeCloseTo(0)
    // A sprinting jump that grazes it diagonally goes back nearly the way it came, at no more than 8 m/s.
    const sprinted = rebound([x + 0.3, y - 0.5, z - 0.5], [-6.4, 1, 6.4])
    expect(Math.hypot(sprinted[0], sprinted[2])).toBeCloseTo(8)
    expect((sprinted[0] - sprinted[2]) * Math.SQRT1_2 / 8).toBeGreaterThan(Math.cos(Math.PI / 18))
    // Rising straight into it, the body is thrown out away from its middle, or into the room right under it.
    const beside = rebound([x, y - 1, z + 0.3], [0, 5.4, 0])
    expect(beside[0]).toBeCloseTo(0)
    expect(beside[2]).toBeCloseTo(5)
    const under = rebound([x, y - 1, z], [0, 5.4, 0])
    expect(under[0]).toBeCloseTo(frame.normal[0] * 5)
    expect(under[2]).toBeCloseTo(frame.normal[2] * 5)
  })
})
