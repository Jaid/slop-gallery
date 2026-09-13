import {expect, test} from 'bun:test'

import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three/webgpu'

import EgoDiagnostics from '../src/EgoDiagnostics.ts'
import EgoZoom from '../src/EgoZoom.ts'

test('zoom uses an eased reversible tween and does not overwrite another camera owner', () => {
  const camera = new PerspectiveCamera(62)
  const zoom = new EgoZoom
  expect(zoom.update(camera, true, 2, 0.2, 0.05)).toBeCloseTo(0.0625)
  expect(camera.fov).toBeCloseTo(60.0625)
  expect(zoom.update(camera, true, 2, 0.2, 0.05)).toBeCloseTo(0.5)
  expect(camera.fov).toBeCloseTo(46.5)
  expect(zoom.update(camera, false, 2, 0.2, 0.1)).toBeCloseTo(0.25)
  expect(camera.fov).toBeCloseTo(54.25)
  expect(zoom.update(camera, false, 2, 0.2, 0.1)).toBe(0)
  expect(camera.fov).toBe(62)
  zoom.update(camera, true, 2, 0, 0)
  expect(camera.fov).toBe(31)
  camera.fov = 45
  zoom.reset()
  expect(camera.fov).toBe(45)
  zoom.update(camera, true, 3, 0, 0)
  expect(camera.fov).toBe(15)
  const next = new PerspectiveCamera(60)
  zoom.update(next, true, 2, 0, 0)
  expect(camera.fov).toBe(45)
  expect(next.fov).toBe(30)
  zoom.reset()
  expect(next.fov).toBe(60)
})
test('diagnostic dumps detach all data and preserve precise surface placement information', () => {
  const scene = new Scene
  const camera = new PerspectiveCamera(62, 1, 0.05, 90)
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new MeshBasicMaterial
  const wall = new Mesh(geometry, material)
  wall.position.z = -5.123_456_789
  wall.userData = {wallId: 'test-wall'}
  scene.add(wall)
  const diagnostics = new EgoDiagnostics(scene, camera)
  const state = {
    active: true,
    grounded: true,
    crouching: false,
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
    velocity: {
      x: 0,
      y: 0,
      z: 0,
    },
  }
  const keys = {dump: true}
  try {
    const dump = diagnostics.capture(state, keys)
    expect(dump.aim.hit?.point.z).toBeCloseTo(-4.123_456_789, 10)
    expect(dump.aim.hit?.normal).toEqual({
      x: 0,
      y: 0,
      z: 1,
    })
    expect(dump.aim.hit?.mesh.metadata.wallId).toBe('test-wall')
    expect(dump.camera.fov).toBe(62)
    expect(structuredClone(dump)).toEqual(dump)
    state.position.x = 99
    keys.dump = false
    camera.position.y = 20
    expect(dump.player.position.x).toBe(0)
    expect(dump.input.dump).toBe(true)
    expect(dump.camera.position.y).toBe(0)
    expect(diagnostics.capture(state, keys).id).not.toBe(dump.id)
  } finally {
    geometry.dispose()
    material.dispose()
  }
})
