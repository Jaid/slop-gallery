import {describe, expect, test} from 'bun:test'

import {PerspectiveCamera, Vector3} from 'three/webgpu'

import OrbitInspection from '../../src/lib/camera/OrbitInspection.ts'

const center = new Vector3(0, 1, 0)
function setup() {
  const camera = new PerspectiveCamera(75, 16 / 9, 0.05, 200)
  camera.position.set(3, 1.05, 4)
  camera.lookAt(center)
  return {
    camera,
    orbit: new OrbitInspection(camera, center, 0.85),
  }
}
function settle(orbit: OrbitInspection) {
  for (let i = 0; i < 300; i++) {
    orbit.update(center, 1 / 60)
  }
}
describe('hold-to-orbit camera', () => {
  test('approaches smoothly, narrows FOV and stays aimed at the Knot', () => {
    const {camera, orbit} = setup()
    const original = camera.position.clone()
    orbit.update(center, 1 / 60)
    expect(camera.position.distanceTo(original)).toBeGreaterThan(0)
    expect(camera.position.distanceTo(original)).toBeLessThan(1)
    settle(orbit)
    expect(camera.fov).toBeCloseTo(75 * 0.85, 5)
    expect(camera.position.distanceTo(center)).toBeCloseTo(0.85 / Math.sin(75 * 0.85 * Math.PI / 360) * 0.96, 5)
    expect(camera.getWorldDirection(new Vector3).dot(center.clone().sub(camera.position).normalize())).toBeGreaterThan(0.9999)
  })
  test('orbits on both axes and returns around, not through, the object', () => {
    const {camera, orbit} = setup()
    const original = camera.position.clone()
    const rotation = camera.quaternion.clone()
    settle(orbit)
    const near = camera.position.clone()
    orbit.addInput(Math.PI, 0.3)
    settle(orbit)
    expect(camera.position.distanceTo(near)).toBeGreaterThan(2)
    expect(camera.position.y).toBeGreaterThan(near.y)
    orbit.release()
    let complete = false
    for (let i = 0; i < 300 && !complete; i++) {
      complete = orbit.update(center, 1 / 60)
      expect(camera.position.distanceTo(center)).toBeGreaterThan(0.85)
    }
    expect(complete).toBe(true)
    expect(camera.position.toArray()).toEqual(original.toArray())
    expect(camera.quaternion.toArray()).toEqual(rotation.toArray())
    expect(camera.fov).toBe(75)
  })
  test('clamps vertical orbit above the floor and ignores invalid input or time', () => {
    const {camera, orbit} = setup()
    orbit.addInput(0, -100)
    settle(orbit)
    expect(camera.position.y).toBeGreaterThanOrEqual(0.1799)
    const before = camera.position.clone()
    orbit.addInput(Number.NaN, Infinity)
    for (const delta of [0, -1, Number.NaN, Infinity]) {
      orbit.update(center, delta)
    }
    expect(camera.position.toArray()).toEqual(before.toArray())
    orbit.release()
    orbit.addInput(10, 10)
    settle(orbit)
    expect(camera.fov).toBe(75)
  })
  test('keeps the same approach at different frame rates and supports portrait aspect ratios', () => {
    const a = setup()
    const b = setup()
    a.camera.aspect = b.camera.aspect = 0.5
    for (let i = 0; i < 60; i++) {
      a.orbit.update(center, 1 / 60)
    }
    for (let i = 0; i < 120; i++) {
      b.orbit.update(center, 1 / 120)
    }
    expect(a.camera.position.distanceTo(b.camera.position)).toBeLessThan(1e-8)
    expect(a.camera.fov).toBeCloseTo(b.camera.fov, 8)
    expect(a.camera.position.distanceTo(center)).toBeGreaterThan(2)
  })
})
