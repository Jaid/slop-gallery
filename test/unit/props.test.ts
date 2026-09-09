import {afterEach, beforeEach, describe, expect, test} from 'bun:test'
import RAPIER from '@dimforge/rapier3d-compat'

import {PropPlacement} from '../../src/lib/physics/PropPlacement.ts'

await RAPIER.init()
let world: RAPIER.World
beforeEach(() => {world = new RAPIER.World({x: 0, y: 0, z: 0})})
afterEach(() => world.free())

function book() {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1.42, 1.6))
  for (const [width, height, depth, y] of [[0.64, 0.095, 0.86, 0], [0.69, 0.025, 0.91, -0.06], [0.69, 0.025, 0.91, 0.06]]) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(width! / 2, height! / 2, depth! / 2).setTranslation(0, y!, 0).setEnabled(false), body)
  }
  return new PropPlacement(world, body)
}
function pedestal() {
  return world.createCollider(RAPIER.ColliderDesc.cuboid(0.58, 0.675, 0.58).setTranslation(0, 0.675, 1.6))
}

describe('carried prop clearance', () => {
  test('pulls the whole book toward the hand instead of through its pedestal', () => {
    const placement = book()
    pedestal()
    world.step()
    const desired: [number, number, number] = [0, 1.2, 1.45]
    expect(placement.hasRoom(desired)).toBe(false)
    const position = placement.constrain([0, 1.4, 0], desired)!
    expect(position).not.toBeNull()
    expect(position[2]).toBeGreaterThan(0.4)
    expect(position[2] + 0.455).toBeLessThan(1.02)
    expect(placement.hasRoom(position)).toBe(true)
  })
  test('uses rotated compound geometry, not a hardcoded bounding radius', () => {
    const placement = book()
    placement.body.setRotation({x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2}, false)
    pedestal()
    world.step()
    const position = placement.constrain([0, 1.4, 0], [0, 1.2, 1.45])!
    expect(position[2]).toBeGreaterThan(0.6)
    expect(position[2] + 0.345).toBeLessThan(1.02)
    expect(placement.hasRoom(position)).toBe(true)
  })
  test('does not tunnel through a thin obstacle to a clear endpoint', () => {
    const placement = book()
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.02).setTranslation(0, 1, 0.9))
    world.step()
    expect(placement.hasRoom([0, 1.4, 1.6])).toBe(true)
    const position = placement.constrain([0, 1.4, 0], [0, 1.4, 1.6])!
    expect(position[2]).toBeLessThan(0.43)
    expect(placement.hasRoom(position)).toBe(true)
  })
  test('ignores the player while holding but checks them before release', () => {
    const placement = book()
    const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased())
    player.userData = {kind: 'player'}
    world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), player)
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.4, 1.45])).toEqual([0, 1.4, 1.45])
    expect(placement.hasRoom([0, 1.4, 0])).toBe(false)
    expect(placement.hasRoom([0, 1.4, 0], false)).toBe(true)
  })
  test('does not treat an unrelated kinematic body like the player', () => {
    const placement = book()
    const door = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.8, 1.3))
    world.createCollider(RAPIER.ColliderDesc.cuboid(1.3, 1.8, 0.14), door)
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.4, 1.45])![2]).toBeLessThan(0.71)
  })
  test('ignores disabled colliders and sensors but respects dynamic props', () => {
    const placement = book()
    pedestal().setSensor(true)
    pedestal().setEnabled(false)
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.2, 1.45])![2]).toBeCloseTo(1.45)
    const prop = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.2, 1.45))
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3), prop)
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.2, 1.45])![2]).toBeLessThan(0.7)
  })
  test('keeps the book above the floor when looking down', () => {
    const placement = book()
    world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.15, 10).setTranslation(0, -0.15, 0))
    world.step()
    const position = placement.constrain([0, 1.4, 0], [0, -0.1, 0])!
    expect(position[1]).toBeGreaterThan(0.09)
    expect(placement.hasRoom(position)).toBe(true)
  })
  test('does not return an intersecting pose when there is no room', () => {
    const placement = book()
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 2))
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.2, 1.45])).toBeNull()
    expect(placement.constrain([0, 1.4, 0], [0, 1.4, 0])).toBeNull()
  })
  test('leaves an unobstructed pose unchanged, including a zero-length move', () => {
    const placement = book()
    world.step()
    expect(placement.constrain([0, 1.4, 0], [0, 1.4, 1.45])).toEqual([0, 1.4, 1.45])
    expect(placement.constrain([0, 1.4, 0], [0, 1.4, 0])).toEqual([0, 1.4, 0])
  })
})

function setPosition(placement: PropPlacement, position: [number, number, number]) {
  placement.body.setTranslation({x: position[0], y: position[1], z: position[2]}, false)
}

describe('carried prop flight', () => {
  test('eases toward a newly unblocked hand without overshooting or snapping', () => {
    const placement = book()
    setPosition(placement, [0, 1.4, 0])
    world.step()
    let previous = 0
    for (let i = 0; i < 30; i++) {
      const next = placement.follow([0, 1.4, 0.5], 1 / 60)!
      expect(next[2]).toBeGreaterThan(previous)
      expect(next[2]).toBeLessThan(0.5)
      expect(next[2] - previous).toBeLessThan(0.17)
      setPosition(placement, next)
      previous = next[2]
    }
    expect(previous).toBeGreaterThan(0.49999)
  })
  test('settles at the same rate at 30, 60, 144 and 240 fps', () => {
    const placement = book()
    for (const fps of [30, 60, 144, 240]) {
      setPosition(placement, [0, 1.4, 0])
      for (let i = 0; i < fps / 6; i++) {
        setPosition(placement, placement.follow([0, 1.4, 0.5], 1 / fps)!)
      }
      expect(placement.body.translation().z).toBeCloseTo(0.5 * (1 - Math.exp(-4)), 5)
    }
  })
  test('bounds far-away pickups and resumed frames instead of teleporting', () => {
    const placement = book()
    setPosition(placement, [0, 1.4, 0])
    expect(placement.follow([0, 1.4, 9], 1 / 60)![2]).toBeCloseTo(20 / 60)
    expect(placement.follow([0, 1.4, 9], 5)![2]).toBeCloseTo(1)
    for (const delta of [0, -1, NaN, Infinity]) {
      expect(placement.follow([0, 1.4, 9], delta)![2]).toBe(0)
    }
  })
  test('flies off the resting pedestal, then smoothly follows the retreating hand', () => {
    const placement = book()
    pedestal()
    world.step()
    let previous = [0, 1.42, 1.6]
    for (let i = 0; i < 120; i++) {
      const origin: [number, number, number] = [0, 1.4, i < 30 ? 0 : -1]
      const destination = placement.constrain(origin, [0, 1.2, origin[2] + 1.45])!
      expect(destination).not.toBeNull()
      const next = placement.follow(destination, 1 / 60)!
      expect(next).not.toBeNull()
      expect(placement.hasRoom(next, false)).toBe(true)
      expect(Math.hypot(...next.map((v, i) => v - previous[i]!))).toBeLessThanOrEqual(20 / 60 + 0.0001)
      if (i === 0) {
        expect(next[1]).toBeGreaterThan(1.42)
        expect(next[2]).toBeGreaterThan(1.6 - 20 / 60)
      }
      if (i === 30) expect(next[2]).toBeGreaterThan(destination[2])
      setPosition(placement, next)
      previous = next
      world.step()
    }
    expect(previous[1]).toBeCloseTo(1.2, 3)
    expect(previous[2]).toBeCloseTo(0.45, 3)
  })
  test('checks the flight path as well as the destination', () => {
    const placement = book()
    setPosition(placement, [0, 1.4, 0])
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.02).setTranslation(0, 1, 0.9))
    world.step()
    expect(placement.hasRoom([0, 1.4, 1.6])).toBe(true)
    for (let i = 0; i < 120; i++) {
      const next = placement.follow([0, 1.4, 1.6], 1 / 60)!
      expect(next[2]).toBeLessThan(0.43)
      expect(placement.hasRoom(next, false)).toBe(true)
      setPosition(placement, next)
    }
  })
  test('slides along a rotated obstacle without penetrating it', () => {
    const placement = book()
    setPosition(placement, [0, 1.4, 0])
    world.createCollider(RAPIER.ColliderDesc.cuboid(3, 2, 0.02).setTranslation(0, 1, 1.2).setRotation({x: 0, y: Math.sin(Math.PI / 8), z: 0, w: Math.cos(Math.PI / 8)}))
    world.step()
    for (let i = 0; i < 90; i++) {
      const next = placement.follow([0, 1.4, 2], 1 / 60)!
      expect(next).not.toBeNull()
      expect(placement.hasRoom(next, false)).toBe(true)
      setPosition(placement, next)
    }
    expect(Math.abs(placement.body.translation().x)).toBeGreaterThan(0.3)
  })
  test('smooths movement without disabling collision checks', () => {
    const placement = book()
    setPosition(placement, [0, 1.4, 0])
    const next = placement.follow([0, 1.4, 1.6], 1 / 60)!
    expect(next[2]).toBeGreaterThan(0)
    expect(next[2]).toBeLessThan(1.6)
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.02).setTranslation(0, 1, 0.9))
    world.step()
    const blocked = placement.follow([0, 1.4, 1.6], 0.05)!
    expect(blocked[2]).toBeLessThan(0.43)
    expect(placement.hasRoom(blocked, false)).toBe(true)
  })
})
