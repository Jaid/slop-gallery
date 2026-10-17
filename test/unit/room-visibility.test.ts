import type {Vec3} from '../../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {Frustum, Matrix4, PerspectiveCamera, Sphere, Vector3} from 'three/webgpu'

import {portals, roomContaining, roomEnclosing, visibleRooms} from '../../src/lib/gallery/roomVisibility.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'

const view = (position: Vec3, target: Vec3) => {
  const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 90)
  camera.position.set(...position)
  camera.lookAt(...target)
  camera.updateMatrixWorld()
  const frustum = new Frustum
  const projection = new Matrix4
  return frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse), camera.coordinateSystem)
}
test('every room contains its own center', () => {
  for (const room of rooms) {
    expect(roomContaining([room.center[0], room.floorY + 1.6, room.center[1]])).toBe(room.id)
  }
})
test('every room is reachable through its portals', () => {
  const linked = new Set(portals.flatMap(portal => portal.rooms))
  expect(rooms.filter(room => !linked.has(room.id))).toEqual([])
})
test('a room shows the rooms behind the openings in view', () => {
  // From the Vesper through both side doors of the Lobby into Dine, and through the Lobby’s glass wall into the Salon, but no further.
  const vesper = visibleRooms('vesper', view([-14, 1.6, 3], [14, 1.6, 3]))
  expect(vesper.has('dine')).toBe(true)
  expect(['moonfall', 'lodge', 'corridor'].filter(room => vesper.has(room as never))).toEqual([])
  // The Salon’s glass wall shows the Lobby extension, and the Lobby’s shows the Salon.
  expect(visibleRooms('salon', view([16, 1.6, -20], [0, 1.6, -20])).has('lobby')).toBe(true)
  expect(visibleRooms('lobby', view([0, 1.6, -28], [8, 1.6, -20])).has('salon')).toBe(true)
  // Facing the blank west wall of the Vesper.
  expect([...visibleRooms('vesper', view([-14, 1.6, 0], [-20, 1.6, 0]))]).toEqual(['vesper'])
  const lobby = visibleRooms('lobby', view([0, 1.6, -28], [0, 1.6, 8]))
  expect(lobby.has('corridor')).toBe(false)
  expect(lobby.has('antechamber')).toBe(true)
})
test('objects reaching past one room belong to none', () => {
  expect(roomEnclosing(new Sphere(new Vector3(-14, 2, 0), 1))).toBe('vesper')
  // The wall between the Lobby and the Vesper.
  expect(roomEnclosing(new Sphere(new Vector3(-8, 2, 0), 0.5))).toBeUndefined()
})
