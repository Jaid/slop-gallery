import {afterEach, beforeEach, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {knotsById} from 'knot-materials'

import GrabbableBody from '../../src/lib/physics/GrabbableBody.ts'
import KnotRotation from '../../src/lib/physics/KnotRotation.ts'

await RAPIER.init()
let world: RAPIER.World
beforeEach(() => world = new RAPIER.World({
  x: 0,
  y: -9.81,
  z: 0,
}))
afterEach(() => world.free())
test('uses the corrected contributor titles', () => {
  expect(knotsById.get('opal_fire')!.modelTitle).toBe('Claude Sonnet 5')
  expect(knotsById.get('aurora_veil')!.modelTitle).toBe('DeepSeek 4.1 Flash')
  expect(knotsById.get('cyber_kintsugi')!.modelTitle).toBe('Gemini 3.8 Flash')
})
test('rotates showcased Knots and colliders together without translating them', () => {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 3))
  const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.4, 0.2), body)
  const rotation = new KnotRotation
  for (let i = 0; i < 600; i++) {
    rotation.step(body, 1 / 60)
  }
  world.step()
  expect(rotation.isShowcased(body)).toBe(true)
  expect(body.rotation().y).toBeCloseTo(Math.SQRT1_2, 5)
  expect(body.rotation().w).toBeCloseTo(Math.SQRT1_2, 5)
  expect(collider.rotation().y).toBeCloseTo(body.rotation().y, 5)
  expect(body.translation()).toEqual({
    x: 2,
    y: 1,
    z: 3,
  })
  const before = body.rotation()
  for (const delta of [0, -1, Infinity, Number.NaN]) {
    rotation.step(body, delta)
  }
  expect(body.rotation()).toEqual(before)
})
test('Rapier force release is one-way and never resumes showcase rotation', () => {
  const rotation = new KnotRotation
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  rotation.step(body, 1)
  expect(rotation.isShowcased(body)).toBe(true)
  expect(rotation.release(body)).toBe(true)
  expect(rotation.isShowcased(body)).toBe(false)
  expect(body.isDynamic()).toBe(true)
  expect(rotation.release(body)).toBe(false)
  const releasedRotation = body.rotation()
  rotation.step(body, 10)
  expect(body.rotation()).toEqual(releasedRotation)
  // Grabbing temporarily fixes a released Knot; this must not put it back into showcase mode.
  body.setBodyType(RAPIER.RigidBodyType.Fixed, true)
  rotation.step(body, 10)
  expect(body.rotation()).toEqual(releasedRotation)
  expect(rotation.isShowcased(body)).toBe(false)
})
test('showcase state blocks grabbing until the Knot has been physically released', () => {
  const rotation = new KnotRotation
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body)
  const carried = new GrabbableBody(body, world, {
    canGrab: () => !rotation.isShowcased(body),
  })
  expect(carried.grab()).toBe(false)
  rotation.release(body)
  expect(carried.grab()).toBe(true)
  expect(body.isFixed()).toBe(true)
  carried.cancel()
  expect(body.isDynamic()).toBe(true)
})
test('rotation is timestep independent and leaves ordinary dynamic bodies alone', () => {
  const rotation = new KnotRotation
  const a = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  rotation.step(a, 10)
  for (let i = 0; i < 1200; i++) {
    rotation.step(b, 1 / 120)
  }
  expect(a.rotation().y).toBeCloseTo(b.rotation().y, 5)
  const dynamic = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setAngvel({
    x: 1,
    y: 2,
    z: 3,
  }))
  const before = dynamic.rotation()
  rotation.step(dynamic, 10)
  expect(dynamic.rotation()).toEqual(before)
  expect(dynamic.angvel()).toEqual({
    x: 1,
    y: 2,
    z: 3,
  })
})
