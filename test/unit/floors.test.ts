import type {FloorRectangle} from '../../src/lib/gallery/floors.ts'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {floorGlassThickness, roomFloorPlan, subtractFloorOpening} from '../../src/lib/gallery/floors.ts'
import {lobby} from '../../src/lib/gallery/lobby.ts'
import {insideGallery, rooms, roomVisit, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const room = rooms.find(value => value.id === 'lobby')!
const plan = roomFloorPlan(room)
const area = (rectangles: Array<FloorRectangle>) => rectangles.reduce((sum, rectangle) => sum + rectangle.size[0] * rectangle.size[1], 0)
describe('rectangular floor openings', () => {
  test('handles disjoint, touching, covering and partial cuts without degenerate rectangles', () => {
    const rectangle: FloorRectangle = {
      center: [0, 0],
      size: [10, 10],
    }
    expect(subtractFloorOpening(rectangle)).toEqual([rectangle])
    expect(subtractFloorOpening(rectangle, {
      center: [12, 0],
      size: [2, 2],
    })).toEqual([rectangle])
    expect(subtractFloorOpening(rectangle, {
      center: [6, 0],
      size: [2, 2],
    })).toEqual([rectangle])
    expect(subtractFloorOpening(rectangle, rectangle)).toEqual([])
    expect(subtractFloorOpening(rectangle, {
      center: [0, 0],
      size: [20, 20],
    })).toEqual([])
    expect(area(subtractFloorOpening(rectangle, {
      center: [5, 0],
      size: [4, 4],
    }))).toBe(92)
    expect(area(subtractFloorOpening(rectangle, {
      center: [0, 0],
      size: [2, 20],
    }))).toBe(80)
  })
  test('reserves an 8 × 8 square with at least four meters of padding', () => {
    expect(lobby.previousNorthZ - lobby.northZ).toBe(24)
    expect(lobby.opening.size).toEqual([8, 8])
    expect(area(plan.slabs)).toBe(16 * 40 - 8 * 8)
    expect(plan.slabs).toHaveLength(4)
    expect(plan.glazing).toEqual({
      center: [0, -8],
      size: [8, 8],
    })
    expect((lobby.width - lobby.opening.size[0]) / 2).toBe(4)
    expect(lobby.opening.center[1] - lobby.opening.size[1] / 2 - lobby.northZ).toBe(8)
    expect(lobby.previousNorthZ - (lobby.opening.center[1] + lobby.opening.size[1] / 2)).toBe(8)
    const visit = roomVisit(room)
    expect(visit.position[0]).toBe(0)
    expect(visit.position[1]).toBe(1.7)
    expect(visit.position[2]).toBeCloseTo(5.6)
    expect(insideGallery([7, 1.7, -20])).toBe(true)
    expect(insideGallery([0, 1.7, -31])).toBe(true)
    expect(insideGallery([9, 1.7, -20])).toBe(false)
    expect(walls.find(wall => wall.id === 'lobby-north')!.center).toEqual([0, 0, -32])
    for (const side of ['west', 'east']) {
      const extension = walls.find(wall => wall.id === `lobby-extension-${side}`)!
      expect(extension.center[2] - extension.width / 2).toBe(-32)
      expect(extension.center[2] + extension.width / 2).toBe(-8)
      expect(walls.find(wall => wall.id === `lobby-${side}`)!.center[2]).toBe(0)
    }
  })
  test('slabs, grout and inlays are all absent over the opening', () => {
    const opening: FloorRectangle = {
      center: [lobby.opening.center[0] - room.center[0], lobby.opening.center[1] - room.center[1]],
      size: lobby.opening.size,
    }
    for (const rectangle of [...plan.slabs, ...plan.seams, ...plan.inlays]) {
      expect(subtractFloorOpening(rectangle, opening)).toEqual([rectangle])
      expect(rectangle.size.every(value => value > 0 && Number.isFinite(value))).toBe(true)
    }
    for (const other of rooms.filter(value => value.id !== 'lobby')) {
      expect(roomFloorPlan(other).glazing).toBeUndefined()
      expect(roomFloorPlan(other).slabs).toEqual([
        {
          center: [0, 0],
          size: other.size,
        },
      ])
    }
  })
  test('slabs leave a real cutout and flush glazing supports the opening and its seams', () => {
    const material = new MeshBasicMaterial
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    const meshes = plan.slabs.map(({center: [x, z], size: [width, depth]}) => {
      const mesh = new Mesh(new BoxGeometry(width, 0.24, depth), material)
      mesh.position.set(x + room.center[0], -0.12, z + room.center[1])
      mesh.updateMatrixWorld(true)
      world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, 0.12, depth / 2).setTranslation(mesh.position.x, mesh.position.y, mesh.position.z))
      return mesh
    })
    try {
      world.step()
      for (const x of [-7, -4.01, -3.99, 0, 3.99, 4.01, 7]) {
        for (const z of [-31, -24.01, -23.99, -20, -16.01, -15.99, -9, -7, 0, 5.8]) {
          const solid = !(Math.abs(x) < 4 && z > -24 && z < -16)
          const origin = new Vector3(x, 1, z)
          const direction = new Vector3(0, -1, 0)
          expect(new Raycaster(origin, direction, 0, 2).intersectObjects(meshes).length > 0).toBe(solid)
          expect(!!world.castRay(new RAPIER.Ray(origin, direction), 2, true)).toBe(solid)
        }
      }
      const glazing = plan.glazing!
      const glass = new Mesh(new BoxGeometry(glazing.size[0], floorGlassThickness, glazing.size[1]), material)
      glass.position.set(glazing.center[0] + room.center[0], -floorGlassThickness / 2, glazing.center[1] + room.center[1])
      glass.updateMatrixWorld(true)
      meshes.push(glass)
      world.createCollider(RAPIER.ColliderDesc.cuboid(glazing.size[0] / 2, floorGlassThickness / 2, glazing.size[1] / 2).setTranslation(glass.position.x, glass.position.y, glass.position.z))
      world.step()
      for (const x of [-4.01, -4, -3.99, 0, 3.99, 4, 4.01]) {
        for (const z of [-24.01, -24, -23.99, -20, -16.01, -16, -15.99]) {
          const origin = new Vector3(x, 1, z)
          const direction = new Vector3(0, -1, 0)
          expect(new Raycaster(origin, direction, 0, 2).intersectObjects(meshes)[0].point.y).toBeCloseTo(0)
          expect(world.castRay(new RAPIER.Ray(origin, direction), 2, true)!.timeOfImpact).toBeCloseTo(1)
        }
      }
      const supported = [-7, -4, 0, 4, 7].map(x => {
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 1, -20))
        world.createCollider(RAPIER.ColliderDesc.ball(0.25), body)
        return body
      })
      for (let i = 0; i < 120; i++) {
        world.step()
      }
      for (const body of supported) {
        expect(body.translation().y).toBeCloseTo(0.25, 2)
      }
    } finally {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
      }
      material.dispose()
      world.free()
    }
  })
})
