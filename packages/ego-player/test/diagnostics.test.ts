import {expect, test} from 'bun:test'

import {BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene} from 'three/webgpu'

import EgoDiagnostics from '../src/EgoDiagnostics.ts'

test('diagnostic dumps detach all data, round to millimeters and keep only identifying surface information', () => {
  const scene = new Scene
  const camera = new PerspectiveCamera(62, 1, 0.05, 90)
  const geometry = new BoxGeometry(2, 2, 2)
  const material = new MeshBasicMaterial
  const wall = new Mesh(geometry, material)
  wall.position.z = -5.123456789
  wall.name = 'wall'
  wall.userData = {wallId: 'test-wall'}
  const group = new Group
  group.name = 'room'
  group.userData = {
    room: 'test-room',
    wallId: 'shadowed',
  }
  const wrapper = new Group
  wrapper.add(wall)
  group.add(wrapper)
  scene.add(group)
  const diagnostics = new EgoDiagnostics(scene, camera)
  const state = {
    active: true,
    grounded: true,
    crouching: false,
    flying: false,
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
    const [hit] = dump.hits
    expect(hit.point).toEqual({
      x: 0,
      y: 0,
      z: -4.123,
    })
    expect(hit.distance).toBe(4.123)
    expect(hit.localPoint).toEqual({
      x: 0,
      y: 0,
      z: 1,
    })
    expect(hit.normal).toEqual({
      x: 0,
      y: 0,
      z: 1,
    })
    expect(hit.mesh).toBe('wall')
    expect(hit.path).toEqual(['room'])
    expect(hit.metadata).toEqual({
      wallId: 'test-wall',
      room: 'test-room',
    })
    expect(hit).not.toContainKeys(['instanceId', 'material'])
    expect(dump.camera.fov).toBe(62)
    expect(dump.camera.yaw).toBe(0)
    expect(dump.camera).not.toContainKey('roll')
    expect(dump.input).toEqual(['dump'])
    expect(structuredClone(dump)).toEqual(dump)
    state.position.x = 99
    keys.dump = false
    camera.position.y = 20
    expect(dump.player.position.x).toBe(0)
    expect(dump.input).toEqual(['dump'])
    expect(dump.camera.position.y).toBe(0)
    expect(diagnostics.capture(state, keys).id).not.toBe(dump.id)
  } finally {
    geometry.dispose()
    material.dispose()
  }
})
