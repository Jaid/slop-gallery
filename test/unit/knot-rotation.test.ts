import {afterEach, beforeEach, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'

import {knotsByNumber} from '../../src/lib/knots/index.ts'
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
  expect(knotsByNumber.get(15)!.modelTitle).toBe('Claude Sonnet 5')
  expect(knotsByNumber.get(17)!.modelTitle).toBe('DeepSeek 4.1 Flash')
  expect(knotsByNumber.get(32)!.modelTitle).toBe('Gemini 3.6 Flash')
})
test('rotates fixed Knots and colliders together without translating them', () => {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(2, 1, 3))
  const collider = world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.4, 0.2), body)
  const rotation = new KnotRotation
  for (let i = 0; i < 600; i++) {
    rotation.step(body, 1 / 60)
  }
  world.step()
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
test('rotation is timestep independent and leaves thrown bodies alone', () => {
  const rotation = new KnotRotation
  const a = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
  rotation.step(a, 10)
  for (let i = 0; i < 1200; i++) {
    rotation.step(b, 1 / 120)
  }
  expect(a.rotation().y).toBeCloseTo(b.rotation().y, 5)
  const thrown = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setAngvel({
    x: 1,
    y: 2,
    z: 3,
  }))
  const before = thrown.rotation()
  rotation.step(thrown, 10)
  expect(thrown.rotation()).toEqual(before)
  expect(thrown.angvel()).toEqual({
    x: 1,
    y: 2,
    z: 3,
  })
})
