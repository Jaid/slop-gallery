import type {Vec3} from '../../src/lib/gallery/types.ts'

import {expect, test} from 'bun:test'

import {Box3, Frustum, Matrix4, PerspectiveCamera, Sphere, Vector3} from 'three/webgpu'

import {portals, roomContaining, roomEnclosing, roomsAt, roomsOverlapping, visibleRegions, visibleRooms} from '../../src/lib/gallery/roomVisibility.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'

const viewProjection = (position: Vec3, target: Vec3) => {
  const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 90)
  camera.position.set(...position)
  camera.lookAt(...target)
  camera.updateMatrixWorld()
  const matrix = new Matrix4
  return matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
}
const view = (position: Vec3, target: Vec3) => {
  const frustum = new Frustum
  return frustum.setFromProjectionMatrix(viewProjection(position, target))
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
  expect(visibleRooms('lobby', view([0, 1.6, -28], [8, 1.6, -24])).has('salon')).toBe(true)
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
test('objects belong to every room they reach into', () => {
  // The wall between the Lobby and the Vesper.
  expect(roomsOverlapping(new Box3(new Vector3(-8.2, 1, -1), new Vector3(-7.8, 3, 1))).toSorted()).toEqual(['lobby', 'vesper'])
  expect(roomsOverlapping(new Box3(new Vector3(-15, 1, -1), new Vector3(-13, 3, 1)))).toEqual(['vesper'])
  expect(roomsOverlapping(new Box3(new Vector3(500, 1, 500), new Vector3(501, 2, 501)))).toEqual([])
})
test('the Corridor’s stair flight up to the Sienna belongs to the Corridor', () => {
  expect(roomContaining([-25, -1.5, 10.4])).toBe('corridor')
  expect(roomsOverlapping(new Box3(new Vector3(-26, -2, 9), new Vector3(-24, 0, 12)))).toEqual(['corridor'])
  // Flying at the hall’s south end, where the flight turns off, with the Sienna’s doorway out of view.
  expect(roomsAt([-33.27, -3.12, 4.36])).toEqual(['corridor'])
})
test('a camera stands in the rooms around it', () => {
  expect(roomsAt([-14, 1.6, 0])).toEqual(['vesper'])
  expect(roomsAt([500, 1.6, 500])).toEqual([])
})
test('rooms behind openings only show through them', () => {
  const position: Vec3 = [-14, 1.6, 3]
  const target: Vec3 = [14, 1.6, 3]
  const regions = visibleRegions(roomsAt(position), viewProjection(position, target))
  // Through the Lobby’s side doors into Dine, but not to the Salon and Antechamber, whose openings lie outside the door the Vesper looks through.
  const coarse = visibleRooms('vesper', view(position, target))
  expect(regions.keys().filter(room => !coarse.has(room)).toArray()).toEqual([])
  expect(regions.has('dine')).toBe(true)
  expect(regions.has('salon')).toBe(false)
  const [left, bottom, right, top] = regions.get('lobby')![0]
  // The door into the Lobby covers only part of the screen.
  expect((right - left) * (top - bottom)).toBeLessThan(4)
  expect(visibleRegions(['vesper'], viewProjection([-14, 1.6, 0], [-20, 1.6, 0])).keys().toArray()).toEqual(['vesper'])
})
