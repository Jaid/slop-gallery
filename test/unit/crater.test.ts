import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {lowerGallery} from '../../src/lib/gallery/lowerGallery.ts'
import {moonfallCrater} from '../../src/lib/gallery/moonfall/config.ts'
import {CraterGeometry} from '../../src/lib/gallery/moonfall/CraterGeometry.ts'
import {craterTerrain, CraterTerrain} from '../../src/lib/gallery/moonfall/CraterTerrain.ts'
import {PlayerSession} from '../../src/lib/gallery/PlayerSession.ts'
import {RopeRing} from '../../src/lib/gallery/railings/RopeRing.ts'
import {StanchionRingGeometry} from '../../src/lib/gallery/railings/StanchionRingGeometry.ts'
import {staircase} from '../../src/lib/gallery/staircase.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {floorHeight, insideGallery, roomAt, rooms, roomVisit, wallPosition, walls} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'

await RAPIER.init()
const room = rooms.find(value => value.id === 'moonfall')!
const geometry = new CraterGeometry
const fence = new StanchionRingGeometry(moonfallCrater.fenceRadius, moonfallCrater.fencePosts)
const surfaceCollisions = [geometry.floor, geometry.terrain, geometry.rocks, fence.posts, fence.rope].map(colliderGeometry)
afterAll(() => {
  geometry.dispose()
  fence.dispose()
})
function worldAt(fps = 60) {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / fps
  for (const args of surfaceCollisions) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(...args, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES))
  }
  return world
}
describe('Moonfall impact hall', () => {
  test('the square expansion leaves both existing doorway endpoints connected', () => {
    expect(room.size).toEqual([28, 28])
    expect(room.size[0] * room.size[1]).toBeGreaterThan(4 * 12 * 14)
    const north = walls.find(wall => wall.id === 'moonfall-north')!
    const east = walls.find(wall => wall.id === 'moonfall-east')!
    expect(wallPosition(north, north.holes![0].u, room.floorY, 0)).toEqual([lowerGallery.tunnel.x, room.floorY, lowerGallery.tunnel.southZ])
    const portal = wallPosition(east, east.holes![0].u, room.floorY, 0)
    expect(portal[0]).toBe(staircase.endX)
    expect(portal[2]).toBeCloseTo(staircase.returnZ)
    const visit = roomVisit(room).position
    expect(Math.hypot(visit[0] - room.center[0], visit[2] - room.center[1])).toBeGreaterThan(moonfallCrater.fenceRadius + 0.6)
    for (const [x, z] of [[-20, 6], [-20, 30], [4, 30]]) {
      expect(insideGallery([x, -6.4, z])).toBe(true)
      expect(roomAt([x, -6.4, z])).toBe('moonfall')
    }
  })
  test('the floor has a real circular void and the crater is deep, deterministic and textured', () => {
    const material = new MeshBasicMaterial
    const floor = new Mesh(geometry.floor, material)
    const terrain = new Mesh(geometry.terrain, material)
    const second = new CraterTerrain
    try {
      for (const part of [geometry.floor, geometry.terrain, geometry.rocks, fence.posts, fence.rope]) {
        for (const attribute of Object.values(part.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
      }
      expect(triangleCount(geometry.terrain) + triangleCount(geometry.rocks)).toBeLessThan(60_000)
      for (const [x, z] of [[0, 0], [2, 1], [-4, -3], [7.1, 0], [0, 8.99]]) {
        const ray = new Raycaster(new Vector3(x, 3, z), new Vector3(0, -1, 0))
        expect(ray.intersectObject(floor)).toHaveLength(0)
        const hit = ray.intersectObject(terrain)[0]
        expect(hit).toBeDefined()
        expect(hit.point.y).toBeCloseTo(craterTerrain.height(x, z), 1)
        expect(second.height(x, z)).toBe(craterTerrain.height(x, z))
      }
      expect(craterTerrain.height(0, 0)).toBeLessThan(-2.8)
      expect(craterTerrain.height(2.5, 0)).toBeLessThan(-3)
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16
        expect(craterTerrain.height(Math.cos(angle) * 9, Math.sin(angle) * 9)).toBeCloseTo(0, 8)
      }
      const outside = new Raycaster(new Vector3(10.5, 2, 0), new Vector3(0, -1, 0))
      expect(outside.intersectObject(floor)[0].point.y).toBeCloseTo(0)
      expect(outside.intersectObject(terrain)).toHaveLength(0)
    } finally {
      material.dispose()
    }
  })
  test('the crater floor participates in prop recovery, room lookup and saved player poses', () => {
    for (const [x, z] of [[0, 0], [2.5, -1], [-4, 2]]) {
      const ground = room.floorY + craterTerrain.height(x, z)
      const position: Vec3 = [x + room.center[0], ground + 0.15, z + room.center[1]]
      expect(floorHeight(position)).toBeCloseTo(ground)
      expect(insideGallery(position)).toBe(true)
      expect(roomAt(position)).toBe('moonfall')
      const session = new PlayerSession
      session.capture({
        position,
        yaw: 1.3,
        pitch: 0,
      })
      expect(session.snapshot()).toEqual({
        position,
        yaw: 1.3,
        pitch: 0,
      })
      const document = validateDocument({
        ...createDocument(),
        player: session.snapshot(),
        portraits: [
          {
            ...initialPortraits[0],
            hung: false,
            position,
          },
        ],
      })
      expect(validateDocument(document)).toEqual(document)
    }
  })
  test('dropped objects land inside the depression, not on an invisible flat floor', () => {
    const world = worldAt()
    const bodies = [[0, 0], [2.5, 0], [-2.2, -1.5]].map(([x, z]) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 1, z).setCcdEnabled(true))
      world.createCollider(RAPIER.ColliderDesc.ball(0.13).setRestitution(0), body)
      return body
    })
    try {
      for (let i = 0; i < 360; i++) {
        world.step()
      }
      for (const body of bodies) {
        const {x, y, z} = body.translation()
        expect(y).toBeLessThan(-2)
        expect(y).toBeGreaterThan(-4)
        expect(y).toBeGreaterThan(craterTerrain.height(x, z))
      }
    } finally {
      world.free()
    }
  })
  test('the rope closes exactly, sags between posts and stays outside the cut edge', () => {
    const rope = new RopeRing(moonfallCrater.fenceRadius, moonfallCrater.fencePosts)
    expect(rope.getPoint(0).distanceTo(rope.getPoint(1))).toBeLessThan(1e-10)
    expect(rope.getPoint(0.5 / moonfallCrater.fencePosts).y).toBeCloseTo(0.85)
    expect(rope.getPoint(1 / moonfallCrater.fencePosts).y).toBeCloseTo(1.02)
    for (let i = 0; i <= 256; i++) {
      const {x, z} = rope.getPoint(i / 256)
      expect(Math.hypot(x, z)).toBeGreaterThan(moonfallCrater.radius + 0.8)
    }
    const world = worldAt()
    try {
      world.step()
      const angle = Math.PI / moonfallCrater.fencePosts
      const origin = new Vector3(Math.cos(angle) * 11, 0.4, Math.sin(angle) * 11)
      const direction = new Vector3(-Math.cos(angle), 0, -Math.sin(angle))
      expect(world.castRay(new RAPIER.Ray(origin, direction), 1.5, true)).toBeNull()
    } finally {
      world.free()
    }
  })
  for (const fps of [30, 60, 120]) {
    test(`the stanchion barrier stops sprinting at posts and between them at ${fps} Hz`, () => {
      const world = worldAt(fps)
      try {
        for (const angle of [0, Math.PI / 32, 0.7, 1.8, 3.4, 5.7]) {
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(Math.cos(angle) * 11.2, 0.04, Math.sin(angle) * 11.2))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(Math.cos(angle), Math.sin(angle)))
          for (let i = 0; i < fps * 2; i++) {
            motor.step(world.timestep, {
              forward: true,
              sprint: true,
            }, facing)
            world.step()
          }
          const p = body.translation()
          expect(Math.hypot(p.x, p.z)).toBeGreaterThan(moonfallCrater.fenceRadius + 0.2)
          expect(p.y).toBeCloseTo(0.02, 2)
          motor.dispose()
          world.removeRigidBody(body)
        }
      } finally {
        world.free()
      }
    })
  }
  test('a full walking circuit around the protected crater stays open', () => {
    const world = worldAt()
    const architecture = walls.filter(w => w.room === 'moonfall' && !w.id.includes('stairs')).map(wall => ({
      wall,
      geometry: createArchitectureGeometry(wall),
    }))
    for (const {wall, geometry: part} of architecture) {
      for (const args of part.collision) {
        world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(wall.center[0] - room.center[0], 0, wall.center[2] - room.center[1]).setRotation((new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
      }
    }
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(11, 0.04, 0))
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
    const motor = new EgoMotor(RAPIER, world, body, collider)
    const facing = new Quaternion
    try {
      let waypoint = 1
      for (let i = 0; i < 2400 && waypoint <= 32; i++) {
        const angle = waypoint * Math.PI / 16
        const current = body.translation()
        const dx = Math.cos(angle) * 11 - current.x
        const dz = Math.sin(angle) * 11 - current.z
        if (Math.hypot(dx, dz) < 0.18) {
          waypoint++
          continue
        }
        facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-dx, -dz))
        motor.step(world.timestep, {forward: true}, facing)
        world.step()
      }
      expect(waypoint).toBe(33)
      expect(motor.grounded).toBe(true)
    } finally {
      motor.dispose()
      world.free()
      for (const {geometry: part} of architecture) {
        part.dispose()
      }
    }
  })
})
