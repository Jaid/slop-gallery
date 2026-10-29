import type {WorldRoom} from '../../src/lib/webmcp/analyzeWorld.ts'

import {expect, test} from 'bun:test'

import {AmbientLight, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicNodeMaterial, MeshStandardNodeMaterial, PointLight, Scene} from 'three/webgpu'

import {lodgeBay} from '../../src/lib/gallery/lodge.ts'
import {craterTerrain} from '../../src/lib/gallery/moonfall/CraterTerrain.ts'
import {registerLamp} from '../../src/lib/rendering/lamps.ts'
import analyzeWorld from '../../src/lib/webmcp/analyzeWorld.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'

const square = (id: string, x: number): WorldRoom => ({
  id,
  title: id,
  fence: {
    min: [x - 5, 0, -5],
    max: [x + 5, 4, 5],
  },
})
test('every gallery room is fenced around its origin', () => {
  const worldRooms = slopGallery.worldRooms()
  expect(worldRooms.map(room => room.id)).toEqual(slopGallery.rooms.map(room => room.id))
  const boxes = Object.fromEntries(worldRooms.map(room => [room.id, [room.fence].flat()]))
  // Single boxes stay unwrapped.
  expect(Array.isArray(worldRooms.find(room => room.id === 'vesper')!.fence)).toBe(false)
  // The hall, and the stair flight up to the Sienna’s doorway.
  expect(boxes.corridor).toHaveLength(2)
  expect(boxes.corridor[1].max[0]).toBe(-20)
  // The Corridor and the Lodge meet halfway through the doorway passage between them.
  expect(boxes.lodge).toHaveLength(3)
  expect(boxes.lodge[1].min[0]).toBe(boxes.corridor[0].max[0])
  expect(boxes.lodge[1].max[0]).toBe(boxes.lodge[0].min[0])
  // The Lodge’s bay lies north of its square, as wide and as high.
  expect(boxes.lodge[2].max[2]).toBe(boxes.lodge[0].min[2])
  expect(boxes.lodge[2].min[2]).toBeCloseTo(boxes.lodge[0].min[2] - lodgeBay.depth)
  expect([boxes.lodge[2].min[0], boxes.lodge[2].max[0], boxes.lodge[2].min[1], boxes.lodge[2].max[1]]).toEqual([boxes.lodge[0].min[0], boxes.lodge[0].max[0], boxes.lodge[0].min[1], boxes.lodge[0].max[1]])
  // The Fortress meets the Lodge at its east wall.
  expect(Math.max(...boxes.lodge.map(box => box.max[0]))).toBeLessThan(Math.min(...boxes.fortress.map(box => box.max[0])))
  expect(Math.min(...boxes.fortress.map(box => box.min[0]))).toBe(boxes.lodge[0].max[0])
  // The Moonfall reaches down into its crater, deeper than its floor.
  const moonfall = slopGallery.room('moonfall')
  expect(boxes.moonfall[0].min[1]).toBeCloseTo(moonfall.floorY + craterTerrain.lowest(), 3)
  expect(boxes.moonfall[0].min[1]).toBeLessThan(moonfall.floorY - 3)
  expect(boxes.moonfall[0].max[1]).toBeCloseTo(moonfall.floorY + 5.8, 3)
  for (const room of slopGallery.rooms) {
    const [x, y, z] = room.origin
    expect(boxes[room.id].some(({min, max}) => x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2])).toBe(true)
  }
})
test('meshes land in the room holding most of their volume and spill into the others', () => {
  const scene = new Scene
  const material = new MeshStandardNodeMaterial({name: 'plaster'})
  const group = new Group
  group.name = 'west'
  const box = new Mesh(new BoxGeometry, material)
  box.name = 'box'
  box.position.set(0, 1, 0)
  group.add(box)
  // Centered on the boundary both rooms share, so the earlier room wins the tie.
  const wall = new Mesh(new BoxGeometry, new MeshStandardNodeMaterial)
  wall.name = 'wall'
  wall.position.set(5, 1, 0)
  const instanced = new InstancedMesh(new BoxGeometry, [material, new MeshStandardNodeMaterial, new MeshBasicNodeMaterial], 3)
  const matrix = new Matrix4
  for (const [i, x] of [1, 9, 11].entries()) {
    instanced.setMatrixAt(i, matrix.makeTranslation(x, 1, 1))
  }
  // Far below the west floor, like a crater’s bottom.
  const crater = new Mesh(new BoxGeometry, material)
  crater.name = 'crater'
  crater.position.set(0, -10, 0)
  const outside = new Mesh(new BoxGeometry, new MeshStandardNodeMaterial)
  outside.name = 'outside'
  outside.position.set(30, 1, 0)
  const hidden = new Mesh(new BoxGeometry, material)
  hidden.visible = false
  const lamp = new PointLight('#ff8000', 3, 6, 2)
  // Above the ceiling, like a skylight’s lamp.
  lamp.position.set(10, 30, 0)
  scene.add(group, wall, instanced, crater, outside, hidden, lamp, new AmbientLight)
  const analysis = analyzeWorld(scene, [square('west', 0), square('east', 10)])
  expect(Object.keys(analysis.rooms)).toEqual(['west', 'east'])
  expect(analysis.rooms.west).not.toHaveProperty('id')
  const {west, east} = analysis.rooms
  expect(west.meshes.map(mesh => [mesh.path, mesh.spill])).toEqual([['west/box', undefined], ['wall', 'east'], ['crater', undefined]])
  expect(west.meshes[0].material).toBe('plaster')
  expect(west.meshes[0]).not.toHaveProperty('instances')
  expect(west.meshes[1]).not.toHaveProperty('material')
  expect(east.meshes).toEqual([{
    path: 'Mesh',
    instances: 3,
    // Plain MeshStandardNodeMaterials are left out.
    material: ['plaster', 'MeshBasicNodeMaterial'],
    spill: 'west',
    triangles: 36,
  }])
  expect(analysis.elsewhere.meshes).toEqual([{
    path: 'outside',
    triangles: 12,
  }])
  expect(east.lights).toHaveLength(1)
  expect(east.lights[0]).toMatchObject({
    type: 'PointLight',
    position: [10, 30, 0],
    color: '#ff8000',
    intensity: 3,
    distance: 6,
    decay: 2,
  })
  expect(analysis.globalLights.map(light => light.type)).toEqual(['AmbientLight'])
})
test('each room lists the lights of other regions its room lists leave on', () => {
  const scene = new Scene
  const lamp = (name: string, x: number, lightRooms?: Array<string>) => {
    const light = new PointLight
    light.name = name
    light.position.set(x, 2, 0)
    if (lightRooms) {
      registerLamp(light, {
        id: name,
        optional: false,
        rooms: lightRooms,
      })
    }
    scene.add(light)
    return light
  }
  lamp('everywhere', 0)
  lamp('west-only', 0, ['west'])
  lamp('seen-from-east', 0, ['west', 'east'])
  lamp('passage', 30, ['east'])
  // The shadow pool’s slots only stand in for other lights.
  lamp('slot', 0).userData.shadowSlot = true
  const {west, east} = analyzeWorld(scene, [square('west', 0), square('east', 10)]).rooms
  expect(west.foreignLights).toEqual([])
  expect(east.foreignLights).toEqual([
    {
      path: 'everywhere',
      room: 'west',
    },
    {
      path: 'seen-from-east',
      room: 'west',
    },
    {path: 'passage'},
  ])
})
