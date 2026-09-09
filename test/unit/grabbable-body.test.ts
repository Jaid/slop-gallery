import {afterEach, beforeEach, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'

import {GrabbableBody} from '../../src/lib/physics/GrabbableBody.ts'

await RAPIER.init()
let world: RAPIER.World
beforeEach(() => {
  world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
})
afterEach(() => world.free())
describe('shared grabbing regressions', () => {
  test('lower-gallery props only recover after falling below the lower floor', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 3))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.2, 0.2, 0.2), body)
    const carried = new GrabbableBody(body, world)
    carried.rememberHome()
    body.setTranslation({
      x: 0,
      y: -8.5,
      z: 15,
    }, true)
    carried.recover()
    expect(body.translation().y).toBeCloseTo(-8.5)
    body.setTranslation({
      x: 0,
      y: -13,
      z: 15,
    }, true)
    carried.recover()
    expect(body.translation()).toEqual({
      x: 0,
      y: 2,
      z: 3,
    })
  })
  test('sleeping sculptures wake and cancel restores their dynamic compound colliders', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1, 2, 3))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.05, 0.4), body)
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.35, 0.01, 0.45).setTranslation(0, 0.06, 0), body)
    body.sleep()
    const carried = new GrabbableBody(body, world)
    expect(carried.grab()).toBe(true)
    expect(carried.grab()).toBe(false)
    expect(body.isSleeping()).toBe(false)
    expect(body.isFixed()).toBe(true)
    for (let i = 0; i < body.numColliders(); i++) {
      expect(body.collider(i).isEnabled()).toBe(false)
    }
    carried.move([0, 1.4, 0], [0, 1.4, 1], 1 / 60)
    carried.cancel()
    expect(body.translation()).toEqual({
      x: 1,
      y: 2,
      z: 3,
    })
    expect(body.isDynamic()).toBe(true)
    for (let i = 0; i < body.numColliders(); i++) {
      expect(body.collider(i).isEnabled()).toBe(true)
    }
  })
  test('cancel after a completed throw does not stop or teleport the prop', () => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(1, 2, 3))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.05, 0.4), body)
    const carried = new GrabbableBody(body, world)
    carried.grab()
    carried.release(true, [0, 0, 1])
    for (let i = 0; i < 5; i++) {
      world.step()
    }
    const before = body.translation()
    const velocity = body.linvel()
    carried.cancel()
    expect(body.translation()).toEqual(before)
    expect(body.linvel()).toEqual(velocity)
  })
})
