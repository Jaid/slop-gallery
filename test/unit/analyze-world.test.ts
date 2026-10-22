import type {WorldRoom} from '../../src/lib/webmcp/analyzeWorld.ts'

import {expect, test} from 'bun:test'

import {AmbientLight, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicNodeMaterial, MeshStandardNodeMaterial, PointLight, Scene} from 'three/webgpu'

import {rooms} from '../../src/lib/gallery/walls.ts'
import {worldRooms} from '../../src/lib/gallery/worldRooms.ts'
import analyzeWorld from '../../src/lib/webmcp/analyzeWorld.ts'

const square = (id: string, x: number): WorldRoom => ({
  id,
  title: id,
  fence: {
    min: [x - 5, 0, -5],
    max: [x + 5, 4, 5],
  },
})
test('every gallery room is fenced around its center', () => {
  expect(worldRooms.map(room => room.id)).toEqual(rooms.map(room => room.id))
  const boxes = Object.fromEntries(worldRooms.map(room => [room.id, [room.fence].flat()]))
  // Single boxes stay unwrapped.
  expect(Array.isArray(worldRooms.find(room => room.id === 'vesper')!.fence)).toBe(false)
  // The hall, and the stair flight up to the Sienna’s doorway.
  expect(boxes.corridor).toHaveLength(2)
  expect(boxes.corridor[1].max[0]).toBe(-20)
  // The Corridor and the Lodge meet halfway through the doorway passage between them.
  expect(boxes.lodge).toHaveLength(2)
  expect(boxes.lodge[1].min[0]).toBe(boxes.corridor[0].max[0])
  expect(boxes.lodge[1].max[0]).toBe(boxes.lodge[0].min[0])
  for (const room of rooms) {
    expect(boxes[room.id].some(({min, max}) => room.center[0] > min[0] && room.center[0] < max[0] && room.center[1] > min[2] && room.center[1] < max[2])).toBe(true)
  }
})
test('meshes, instances and lights land in the room their center lies in', () => {
  const scene = new Scene
  const material = new MeshStandardNodeMaterial({name: 'plaster'})
  const group = new Group
  group.name = 'west'
  const box = new Mesh(new BoxGeometry, material)
  box.name = 'box'
  box.position.set(0, 1, 0)
  group.add(box)
  // Centered on the boundary both rooms share.
  const wall = new Mesh(new BoxGeometry, new MeshStandardNodeMaterial)
  wall.position.set(5, 1, 0)
  const instanced = new InstancedMesh(new BoxGeometry, [material, new MeshStandardNodeMaterial, new MeshBasicNodeMaterial], 3)
  const matrix = new Matrix4
  for (const [i, x] of [1, 9, 11].entries()) {
    instanced.setMatrixAt(i, matrix.makeTranslation(x, 1, 1))
  }
  const hidden = new Mesh(new BoxGeometry, material)
  hidden.visible = false
  const lamp = new PointLight('#ff8000', 3, 6, 2)
  // Above the ceiling, like a skylight’s lamp.
  lamp.position.set(10, 30, 0)
  scene.add(group, wall, instanced, hidden, lamp, new AmbientLight)
  const analysis = analyzeWorld(scene, [square('west', 0), square('east', 10)])
  const [west, east] = analysis.rooms
  expect(west.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0)).toBe(24)
  expect(west.meshes.map(mesh => [mesh.path, mesh.instances])).toEqual([['west/box', undefined], ['Mesh', undefined]])
  expect(west.meshes[0].material).toBe('plaster')
  // Plain MeshStandardNodeMaterials are left out.
  expect(west.meshes[1].material).toEqual(['plaster', 'MeshBasicNodeMaterial'])
  expect(analysis.elsewhere.meshes[0]).not.toHaveProperty('material')
  expect(east.meshes.map(mesh => [mesh.path, mesh.instances, mesh.triangles])).toEqual([['Mesh', 2, 24]])
  expect(east.lights).toHaveLength(1)
  expect(east.lights[0]).toMatchObject({
    type: 'PointLight',
    position: [10, 30, 0],
    color: '#ff8000',
    intensity: 3,
    distance: 6,
    decay: 2,
  })
  expect(analysis.elsewhere.meshes.map(mesh => mesh.path)).toEqual(['Mesh'])
  expect(analysis.globalLights.map(light => light.type)).toEqual(['AmbientLight'])
})
