import {expect, test} from 'bun:test'

import {Group, PerspectiveCamera, PointLight, Scene} from 'three/webgpu'

import {toggleLightShadow, useLightEdits} from '../../src/lib/rendering/lightLevels.ts'
import {ShadowPool} from '../../src/lib/rendering/shadowPool.ts'

/** a scene holding a pool of `count` slots, and a camera at the origin looking down -z */
const setup = (count: number) => {
  const scene = new Scene
  const pool = new ShadowPool(count)
  scene.add(...pool.slots)
  const camera = new PerspectiveCamera(75, 1, 0.1, 100)
  camera.updateMatrixWorld()
  return {
    camera,
    pool,
    scene,
  }
}
const lamp = (scene: Scene, z: number, shadow?: boolean) => {
  const light = new PointLight('#ffffff', 10, 5)
  light.position.set(0, 0, z)
  if (shadow !== undefined) {
    light.userData.shadow = shadow
  }
  scene.add(light)
  light.updateMatrixWorld()
  return light
}
const update = ({camera, pool, scene}: ReturnType<typeof setup>) => {
  scene.updateMatrixWorld()
  pool.update(scene, camera)
}
test('lights asking for a shadow borrow a slot that copies them, and others don’t', () => {
  const world = setup(2)
  const asking = lamp(world.scene, -4, true)
  const plain = lamp(world.scene, -6)
  update(world)
  expect(world.pool.isLent(asking)).toBe(true)
  expect(world.pool.isLent(plain)).toBe(false)
  const slot = world.pool.slots.find(candidate => candidate.intensity > 0)!
  expect(slot.position.z).toBe(-4)
  expect(slot.intensity).toBe(10)
  expect(slot.distance).toBe(5)
  // The unused slot stays dark and belongs to no room, so its shadow map never updates.
  expect(world.pool.slots.filter(candidate => candidate.intensity === 0)).toHaveLength(1)
})
test('nearer lights win free slots, holders keep theirs and the rest go without', () => {
  const world = setup(1)
  const far = lamp(world.scene, -20, true)
  const near = lamp(world.scene, -4, true)
  update(world)
  expect(world.pool.isLent(near)).toBe(true)
  // Walking around doesn’t take the slot away from its holder.
  near.position.z = -30
  update(world)
  expect(world.pool.isLent(near)).toBe(true)
  expect(world.pool.isLent(far)).toBe(false)
})
test('dark lights and lights out of view free or never take slots', () => {
  const world = setup(1)
  const behind = lamp(world.scene, 20, true)
  update(world)
  expect(world.pool.isLent(behind)).toBe(false)
  const ahead = lamp(world.scene, -4, true)
  update(world)
  expect(world.pool.isLent(ahead)).toBe(true)
  ahead.intensity = 0
  update(world)
  expect(world.pool.isLent(ahead)).toBe(false)
})
test('slots only lend themselves while mounted', () => {
  const world = setup(1)
  const asking = lamp(world.scene, -4, true)
  const holder = new Group
  world.scene.remove(...world.pool.slots)
  holder.add(...world.pool.slots)
  update(world)
  expect(world.pool.isLent(asking)).toBe(false)
})
test('the light editor switches a point light’s request for a shadow', () => {
  const world = setup(1)
  const plain = lamp(world.scene, -4)
  expect(toggleLightShadow(plain)).toBe(true)
  update(world)
  expect(world.pool.isLent(plain)).toBe(true)
  expect(toggleLightShadow(plain)).toBe(false)
  update(world)
  expect(world.pool.isLent(plain)).toBe(false)
  // Back to what its owner set, the edit is gone.
  expect(useLightEdits.getState().shadows.has(plain)).toBe(false)
})
