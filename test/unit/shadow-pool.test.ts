import {expect, test} from 'bun:test'

import {Group, PerspectiveCamera, PointLight, Scene} from 'three/webgpu'

import {roomSwitches, toggleLightShadow, useLightEdits} from '../../src/lib/rendering/lightLevels.ts'
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
test('a slot follows its light where it moved this frame, before the frame updates its matrices', () => {
  const world = setup(1)
  const swing = new Group
  world.scene.add(swing)
  const light = new PointLight('#ffffff', 10, 5)
  light.position.set(0, -0.5, 0)
  light.userData.shadow = true
  swing.add(light)
  swing.position.set(0, 0, -4)
  update(world)
  // Physics moves the body after the last frame’s matrices, like the Sienna chandelier swinging.
  swing.position.x = 0.3
  swing.rotation.z = Math.PI / 2
  world.pool.update(world.scene, world.camera)
  const slot = world.pool.slots[0]
  expect(slot.position.x).toBeCloseTo(0.8)
  expect(slot.position.y).toBeCloseTo(0)
  expect(slot.position.z).toBeCloseTo(-4)
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
test('the pool reports once when more lights in view ask for a shadow than it has slots', () => {
  const world = setup(1)
  const reports: Array<number> = []
  world.pool.onOverflow = lights => reports.push(lights.length)
  const first = lamp(world.scene, -4, true)
  update(world)
  expect(reports).toEqual([])
  lamp(world.scene, -6, true)
  update(world)
  update(world)
  expect(reports).toEqual([2])
  first.intensity = 0
  update(world)
  first.intensity = 10
  update(world)
  expect(reports).toEqual([2, 2])
})
test('a room change names what it switches on and off', () => {
  const scene = new Scene
  const group = new Group
  group.name = 'lodge-chandelier'
  scene.add(group)
  const chandelier = new PointLight
  chandelier.userData.rooms = ['lodge', 'corridor']
  group.add(chandelier)
  for (const _ of [0, 1]) {
    const stairLamp = new PointLight
    stairLamp.name = 'stair-lamp'
    stairLamp.userData.rooms = ['oculus']
    scene.add(stairLamp)
  }
  const everywhere = new PointLight
  everywhere.name = 'sun-fill'
  scene.add(everywhere)
  expect(roomSwitches(scene, 'oculus', 'lodge')).toEqual({
    enabled: 'PointLight in lodge-chandelier',
    enabledCount: 1,
    disabled: 'stair-lamp ×2',
    disabledCount: 2,
  })
})
