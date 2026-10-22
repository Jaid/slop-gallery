import type {WorldRoom} from '../../src/lib/webmcp/analyzeWorld.ts'

import {expect, test} from 'bun:test'

import {AmbientLight, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardNodeMaterial, PointLight, Scene} from 'three/webgpu'

import {outline, roomFootprints} from '../../src/lib/gallery/roomFootprints.ts'
import {rooms} from '../../src/lib/gallery/walls.ts'
import analyzeWorld from '../../src/lib/webmcp/analyzeWorld.ts'

const square = (id: string, x: number): WorldRoom => ({
  id,
  title: id,
  floorY: 0,
  height: 4,
  polygon: [[x - 5, -5], [x + 5, -5], [x + 5, 5], [x - 5, 5]],
})
test('outlines run clockwise from the north-west corner without collinear points', () => {
  expect(outline([{
    minX: 0,
    maxX: 4,
    minZ: 0,
    maxZ: 1,
  }, {
    minX: 0,
    maxX: 1,
    minZ: 0,
    maxZ: 3,
  }, {
    minX: 0,
    maxX: 2,
    minZ: 1,
    maxZ: 2,
  }])).toEqual([[0, 0], [4, 0], [4, 1], [2, 1], [2, 2], [1, 2], [1, 3], [0, 3]])
  expect(() => outline([{
    minX: 0,
    maxX: 1,
    minZ: 0,
    maxZ: 1,
  }, {
    minX: 2,
    maxX: 3,
    minZ: 0,
    maxZ: 1,
  }])).toThrow()
})
test('every gallery room has a footprint around its center', () => {
  expect(roomFootprints.map(room => room.id)).toEqual(rooms.map(room => room.id))
  const corridor = roomFootprints.find(room => room.id === 'corridor')!
  // The passage’s U plus the stair flight up to the Sienna.
  expect(corridor.polygon).toHaveLength(8)
  expect(Math.max(...corridor.polygon.map(([x]) => x))).toBe(-20)
  expect(roomFootprints.filter(({id}) => id !== 'corridor').map(room => room.polygon.length)).toEqual(Array.from({length: rooms.length - 1}, () => 4))
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
  const wall = new Mesh(new BoxGeometry, material)
  wall.position.set(5, 1, 0)
  const instanced = new InstancedMesh(new BoxGeometry, material, 3)
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
  expect(analysis.totals).toEqual({
    meshes: 3,
    instances: 5,
    triangles: 60,
    lights: 2,
  })
  const [west, east] = analysis.rooms
  expect(west.triangles).toBe(24)
  expect(west.meshes.map(mesh => [mesh.path, mesh.instances])).toEqual([['west/box', 1], ['Mesh', 1]])
  expect(west.meshes[0].materials).toEqual(['plaster'])
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
