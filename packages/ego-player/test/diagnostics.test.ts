import {expect, test} from 'bun:test'

import {BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three/webgpu'

import EgoDiagnostics from '../src/EgoDiagnostics.ts'

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
