import {expect, test} from 'bun:test'

import {BoxGeometry, DirectionalLight, Mesh, PointLight, Scene} from 'three/webgpu'

import ShadowCache from '../../src/lib/rendering/ShadowCache.ts'

const setup = () => {
  const scene = new Scene
  const lamp = new PointLight('#fff', 1, 5)
  lamp.castShadow = true
  lamp.position.set(0, 3, 0)
  const near = new Mesh(new BoxGeometry)
  near.castShadow = true
  const far = new Mesh(new BoxGeometry)
  far.castShadow = true
  far.position.set(20, 0, 0)
  scene.add(lamp, near, far)
  const cache = new ShadowCache
  const hidden = new Set<Mesh>
  let active = true
  const step = () => {
    lamp.shadow.needsUpdate = false
    scene.updateMatrixWorld()
    cache.update(scene, hidden, () => active)
    return lamp.shadow.needsUpdate
  }
  return {
    cache,
    far,
    hidden,
    lamp,
    near,
    scene,
    setActive: (value: boolean) => {
      active = value
    },
    step,
  }
}

test('a shadow map renders once and then only when a caster in reach changes', () => {
  const {far, lamp, near, step} = setup()
  expect(step()).toBe(true)
  expect(lamp.shadow.autoUpdate).toBe(false)
  expect(step()).toBe(false)
  far.position.x = 21
  expect(step()).toBe(false)
  near.position.x = 0.5
  expect(step()).toBe(true)
  expect(step()).toBe(false)
  // Leaving the reach clears the spot it left.
  near.position.x = 30
  expect(step()).toBe(true)
  expect(step()).toBe(false)
})

test('casters that appear, disappear or hide count as changes', () => {
  const {hidden, near, scene, step} = setup()
  step()
  hidden.add(near)
  expect(step()).toBe(true)
  hidden.delete(near)
  expect(step()).toBe(true)
  near.visible = false
  expect(step()).toBe(true)
  near.visible = true
  step()
  const added = new Mesh(new BoxGeometry)
  added.castShadow = true
  scene.add(added)
  expect(step()).toBe(true)
  added.removeFromParent()
  expect(step()).toBe(true)
  added.castShadow = false
  scene.add(added)
  expect(step()).toBe(false)
})

test('an inactive light keeps its update until it is active again', () => {
  const {lamp, near, setActive, step} = setup()
  step()
  setActive(false)
  near.position.y = 1
  expect(step()).toBe(false)
  expect(step()).toBe(false)
  setActive(true)
  expect(step()).toBe(true)
  expect(step()).toBe(false)
  lamp.position.x = 1
  expect(step()).toBe(true)
})

test('directional lights test changes against their shadow camera', () => {
  const scene = new Scene
  const sun = new DirectionalLight
  sun.castShadow = true
  sun.position.set(0, 10, 0)
  Object.assign(sun.shadow.camera, {left: -5, right: 5, top: 5, bottom: -5})
  sun.shadow.camera.updateProjectionMatrix()
  const inside = new Mesh(new BoxGeometry)
  inside.castShadow = true
  const outside = new Mesh(new BoxGeometry)
  outside.castShadow = true
  outside.position.set(30, 0, 0)
  scene.add(sun, inside, outside)
  const cache = new ShadowCache
  const step = () => {
    sun.shadow.needsUpdate = false
    scene.updateMatrixWorld()
    cache.update(scene, new Set, () => true)
    return sun.shadow.needsUpdate
  }
  expect(step()).toBe(true)
  outside.position.x = 31
  expect(step()).toBe(false)
  inside.position.x = 1
  expect(step()).toBe(true)
})

test('dispose restores updates every frame', () => {
  const {cache, lamp, step} = setup()
  step()
  cache.dispose()
  expect(lamp.shadow.autoUpdate).toBe(true)
})
