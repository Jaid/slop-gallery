import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {DoubleSide, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {corridorPassage, corridorRails, corridorStairs, insideCorridor} from '../../src/lib/gallery/corridor.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import lodge, {insideLodgeAccess, lodgeTunnel, lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import LodgeWindowGeometry from '../../src/lib/gallery/LodgeWindowGeometry.ts'
import {oculusPlatform} from '../../src/lib/gallery/lowerGallery.ts'
import oculusTower from '../../src/lib/gallery/oculusTower.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import StairCarpetGeometry from '../../src/lib/gallery/stairs/StairCarpetGeometry.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import walls, {floorHeight, insideGallery, placementIssue, roomAt, rooms, wallPosition} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const routePassages = [lodgeTunnel, corridorPassage] as const
const insideRoute = (position: Vec3) => insideLodgeAccess(position) || insideCorridor(position)
const routeWalls = walls.filter(wall => ['lodge', 'corridor'].includes(wall.room) || ['sienna-west', 'oculus-north', 'vesper-west'].includes(wall.id))
const architecture = routeWalls.map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const windowGeometry = new LodgeWindowGeometry
const vaults = [new VaultGeometry(lodgeTunnel), TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts), TimberGeometry.stairs(corridorStairs)]
afterAll(() => {
  windowGeometry.dispose()
  for (const {geometry} of architecture) {
    geometry.dispose()
  }
  for (const vault of vaults) {
    vault.dispose()
  }
})
function createWorld(fps: number) {
  const world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  })
  world.timestep = 1 / fps
  for (const {wall, geometry} of architecture) {
    for (const args of geometry.collision) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation((new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
    }
  }
  for (const vault of vaults) {
    for (const geometry of [vault.shell, vault.ribs]) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
    }
  }
  for (const geometry of [windowGeometry.lining, windowGeometry.glass, windowGeometry.frame]) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
  }
  const box = (position: Vec3, size: Vec3) => world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position))
  for (const passage of routePassages) {
    for (const {center: [x, z], size: [width, depth]} of passage.floors) {
      box([x, passage.floorY - 0.12, z], [width, 0.24, depth])
      box([x, passage.floorY + passage.height + 0.12, z], [width, 0.24, depth])
    }
  }
  for (const block of corridorStairs.blocks) {
    box(block.position, block.size)
  }
  for (const beam of corridorRails) {
    box(beam.position, beam.size).setRotation((new Quaternion).setFromEuler(new Euler(...beam.rotation)))
  }
  box(oculusPlatform.position, oculusPlatform.size)
  box([lodge.center[0], lodge.floorY - 0.15, lodge.center[1]], [10, 0.3, 10])
  box([lodge.center[0], lodge.floorY + lodge.height + 0.12, lodge.center[1]], [10, 0.24, 10])
  box([-14, -0.15, 14], [12, 0.3, 12])
  box([-14, 5.9, 14], [12, 0.3, 12])
  box([-28.7, lodge.floorY + 0.52, -29.5], [0.85, 0.23, 3.3])
  box([-29.06, lodge.floorY + 0.95, -29.5], [0.13, 0.52, 3.3])
  box([-25, lodge.floorY + 0.7, -32.3], [2.5, 0.25, 1.05])
  box([-25, lodge.floorY + 0.1, -26.65], [3.8, 0.2, 1.2])
  return world
}
describe('Lodge and Corridor route', () => {
  test('the timber tunnel keeps its 400 cm span and stays clear of room corners', () => {
    expect(corridorPassage.width).toBe(4)
    expect(corridorStairs.width).toBe(corridorPassage.width)
    expect(lodge.approachX + corridorPassage.width / 2).toBeCloseTo(-31.7)
    for (const id of ['sienna-west', 'lodge-west']) {
      const wall = walls.find(value => value.id === id)!
      const hole = wall.holes![0]
      expect(hole.width).toBe(corridorPassage.width)
      expect(Math.abs(hole.u) + hole.width / 2 + 0.17).toBeLessThan(wall.width / 2)
    }
    const material = new MeshBasicMaterial
    const geometry = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
    try {
      const meshes = [geometry.shell, geometry.ribs].map(part => new Mesh(part, material))
      for (const z of [-28, -20, 0, 7]) {
        for (const side of [-1, 1]) {
          const x = lodge.approachX + side * (corridorPassage.width / 2 - 0.3)
          expect(corridorPassage.floorAt(x, z)).toBe(lodge.floorY)
          expect(insideRoute([x, lodge.floorY + 1.6, z])).toBe(true)
          expect(corridorPassage.floorAt(lodge.approachX + side * (corridorPassage.width / 2 + 0.01), z)).toBeUndefined()
          const hit = new Raycaster(new Vector3(lodge.approachX, lodge.floorY + 1.6, z), new Vector3(side, 0, 0)).intersectObjects(meshes)[0]
          expect(hit.distance).toBeGreaterThan(corridorPassage.width / 2 - 0.26)
          expect(hit.distance).toBeLessThan(corridorPassage.width / 2 - 0.08)
        }
      }
    } finally {
      geometry.dispose()
      material.dispose()
    }
  })
  for (const offset of [-1.1, 1.1]) {
    for (const returning of [false, true]) {
      test(`the outer timber lanes are physically walkable, offset ${offset}, returning ${returning}`, () => {
        const world = createWorld(60)
        const start = returning ? 6 : -27.5
        const end = returning ? -27.5 : 6
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(lodge.approachX + offset, lodge.floorY + 0.04, start))
        const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
        const motor = new EgoMotor(RAPIER, world, body, collider)
        const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), returning ? 0 : Math.PI)
        try {
          for (let i = 0; i < 60 * 12 && Math.abs(body.translation().z - end) > 0.15; i++) {
            motor.step(world.timestep, {
              forward: true,
              sprint: true,
            }, facing)
            world.step()
          }
          expect(Math.abs(body.translation().z - end)).toBeLessThan(0.15)
          expect(body.translation().x).toBeCloseTo(lodge.approachX + offset, 2)
          expect(body.translation().y).toBeCloseTo(lodge.floorY + 0.02, 2)
          expect(motor.grounded).toBe(true)
        } finally {
          motor.dispose()
          world.free()
        }
      })
    }
  }
  test('the stone entrance and both passage mouths match the tower diameter with clear corner trim', () => {
    expect(lodgeTunnel.width).toBe(oculusTower.radius * 2)
    expect(lodgeTunnel.width).toBe(4.4)
    for (const id of ['oculus-north', 'lodge-east']) {
      const wall = walls.find(value => value.id === id)!
      const hole = wall.holes![0]
      expect(hole.width).toBe(lodgeTunnel.width)
      expect(hole.height - (hole.bottom ?? 0)).toBeCloseTo(lodgeTunnel.height)
      expect(Math.abs(hole.u) + hole.width / 2 + 0.17).toBeLessThan(wall.width / 2)
    }
    const material = new MeshBasicMaterial({side: DoubleSide})
    try {
      const meshes = [
        ...architecture.flatMap(({wall, geometry}) => [geometry.surface, ...geometry.trim, ...geometry.cornice].map(part => {
          const mesh = new Mesh(part, material)
          mesh.position.set(...wall.center)
          mesh.rotation.y = wall.rotation
          mesh.updateMatrixWorld()
          return mesh
        })),
        ...[vaults[0].shell, vaults[0].ribs].map(geometry => new Mesh(geometry, material)),
      ]
      for (const offset of [-1.65, 1.65]) {
        const x = lodge.entranceX + offset
        expect(lodgeTunnel.floorAt(x, lodge.entranceZ - 0.5)).toBe(lodge.floorY)
        expect(insideGallery([x, lodge.floorY + 1.6, lodge.entranceZ - 0.5])).toBe(true)
        const ray = new Raycaster(new Vector3(x, lodge.floorY + 1.7, lodge.entranceZ + 0.5), new Vector3(0, 0, -1), 0, lodge.entranceZ - lodge.tunnelZ + 0.5)
        expect(ray.intersectObjects(meshes)).toHaveLength(0)
      }
    } finally {
      material.dispose()
    }
  })
  for (const offset of [-1.65, 1.65]) {
    for (const entrance of [true, false]) {
      for (const returning of [false, true]) {
        test(`the widened stone doorway is walkable at offset ${offset}, entrance ${entrance}, returning ${returning}`, () => {
          const world = createWorld(60)
          const path = entrance ? [[lodge.entranceX + offset, lodge.entranceZ + 1], [lodge.entranceX + offset, lodge.tunnelZ]] : [[-18.5, lodge.tunnelZ + offset], [-23, lodge.tunnelZ + offset]]
          if (returning) {
            path.reverse()
          }
          const [start, end] = path as [[number, number], [number, number]]
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0], lodge.floorY + 0.04, start[1]))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(start[0] - end[0], start[1] - end[1]))
          const distance = () => Math.hypot(body.translation().x - end[0], body.translation().z - end[1])
          try {
            for (let i = 0; i < 60 * 5 && distance() > 0.15; i++) {
              motor.step(world.timestep, {forward: true}, facing)
              world.step()
            }
            expect(distance()).toBeLessThan(0.15)
            expect(body.translation().y).toBeCloseTo(lodge.floorY + 0.02, 2)
            expect(motor.grounded).toBe(true)
            expect(motor.crouching).toBe(false)
          } finally {
            motor.dispose()
            world.free()
          }
        })
      }
    }
  }
  test('navigation, floors and map room share the same raised-platform elevation', () => {
    expect(lodge.floorY).toBe(-5)
    expect(lodge.entranceX).toBe(oculusTower.x)
    expect(rooms.find(room => room.id === 'lodge')!.number).toBe('08')
    expect(rooms.find(room => room.id === 'corridor')!.number).toBe('09')
    for (const passage of routePassages) {
      for (const {center: [x, z]} of passage.floors) {
        const position: Vec3 = [x, passage.floorY + 1.6, z]
        expect(insideRoute(position)).toBe(true)
        expect(insideGallery(position)).toBe(true)
        expect(roomAt(position)).toBe(passage.room)
        expect(floorHeight(position)).toBeCloseTo(passage.floorY)
      }
    }
    for (const block of corridorStairs.blocks) {
      const position: Vec3 = [block.position[0], block.top + 1.6, block.position[2]]
      expect(roomAt(position)).toBe('corridor')
      expect(floorHeight(position)).toBeCloseTo(block.top)
    }
    expect(insideGallery([-18, -3.4, -20])).toBe(false)
    expect(insideGallery([-25, -6.01, -20])).toBe(false)
  })
  test('the Oculus entrance starts at its platform, not at the buried lower floor', () => {
    const wall = walls.find(candidate => candidate.id === 'oculus-north')!
    expect(wall.center[1] + wall.holes![0].bottom!).toBe(lodge.floorY)
    expect(wallPosition(wall, wall.holes![0].u, lodge.floorY, 0)).toEqual([lodge.entranceX, lodge.floorY, lodge.entranceZ])
    const sienna = walls.find(candidate => candidate.id === 'sienna-west')!
    expect(wallPosition(sienna, sienna.holes![0].u, 0, 0)[2]).toBeCloseTo(lodge.siennaZ)
    expect(sienna.holes![0].u + lodge.timberWidth / 2 + 0.17).toBeLessThan(sienna.width / 2)
    const west = walls.find(candidate => candidate.id === 'lodge-west')!
    expect(wallPosition(west, west.holes![0].u, lodge.floorY, 0)).toEqual([-30, lodge.floorY, lodge.returnZ])
    expect(walls.find(candidate => candidate.id === 'lodge-south')!.holes).toBeUndefined()
  })
  test('Sienna opens directly onto descending treads with half-round pads contained on every step', () => {
    const first = corridorStairs.blocks[0]
    expect(first.tread).toBe(true)
    expect(first.top).toBeLessThan(0)
    expect(first.position[0] + first.size[0] / 2).toBe(-20)
    expect(corridorStairs.axis).toBe(0)
    const radius = Math.min(0.38, corridorStairs.run - 0.05)
    const carpet = new StairCarpetGeometry(corridorStairs.width - 0.5, radius)
    try {
      const bounds = carpet.boundingBox!
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(corridorStairs.width - 0.5)
      expect(bounds.min.z).toBeCloseTo(-radius)
      expect(bounds.max.z).toBeCloseTo(0)
      expect(bounds.max.y).toBeCloseTo(0.008)
      expect(bounds.max.x).toBeLessThan(corridorStairs.width / 2 - 0.2)
      carpet.rotateY(Math.PI / 2)
      carpet.computeBoundingBox()
      expect(carpet.boundingBox!.max.x).toBeCloseTo(0)
      expect(carpet.boundingBox!.min.x).toBeCloseTo(-radius)
      for (const block of corridorStairs.blocks.filter(step => step.tread)) {
        const x = block.position[0] + block.size[0] / 2 - 0.025
        expect(x + carpet.boundingBox!.min.x).toBeGreaterThan(block.position[0] - block.size[0] / 2)
        expect(x + carpet.boundingBox!.max.x).toBeLessThan(block.position[0] + block.size[0] / 2)
      }
    } finally {
      carpet.dispose()
    }
  })
  for (const fps of [30, 60, 120]) {
    for (const returning of [false, true]) {
      for (const sprint of [false, true]) {
        test(`real player traverses the entire loop at ${fps} Hz, returning ${returning}, sprint ${sprint}`, () => {
          const world = createWorld(fps)
          const path = [[lodge.entranceX, -29], [lodge.entranceX, lodge.tunnelZ], [-28, lodge.tunnelZ], [-28, lodge.returnZ], [lodge.approachX, lodge.returnZ], [lodge.approachX, lodge.siennaZ], [-31, lodge.siennaZ], [-18.5, lodge.siennaZ]]
          if (returning) {
            path.reverse()
          }
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0], (returning ? 0 : lodge.floorY) + 0.04, path[0][1]))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = new Quaternion
          try {
            let target = 1
            for (let i = 0; i < fps * 80 && target < path.length; i++) {
              const position = body.translation()
              const dx = path[target][0] - position.x
              const dz = path[target][1] - position.z
              if (Math.hypot(dx, dz) < Math.max(0.15, (sprint ? 8 : 3) / fps)) {
                target++
                continue
              }
              facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-dx, -dz))
              // Slow for right-angle corners, as a player would; cruise and climb at full sprint.
              motor.step(world.timestep, {
                forward: true,
                sprint: sprint && Math.hypot(dx, dz) > 3,
              }, facing)
              world.step()
            }
            expect({
              target,
              position: body.translation(),
            }).toMatchObject({target: path.length})
            for (let i = 0; i < fps; i++) {
              motor.step(world.timestep, {}, facing)
              world.step()
            }
            expect(body.translation().y).toBeCloseTo((returning ? lodge.floorY : 0) + 0.02, 2)
            expect(motor.grounded).toBe(true)
          } finally {
            motor.dispose()
            world.free()
          }
        })
      }
    }
  }
  test('the new room accepts hanging and loose artwork in backups', () => {
    const wall = walls.find(candidate => candidate.id === 'lodge-north')!
    const portrait = {
      ...initialPortraits[0],
      wallId: wall.id,
      position: wallPosition(wall, -2.5, lodge.floorY + 2.1),
      width: 1.2,
      height: 1.2,
      rotation: wall.rotation,
    }
    expect(placementIssue(wall, portrait.position, portrait.width, portrait.height, [])).toBe('')
    const saved = validateDocument({
      ...createDocument(),
      portraits: [portrait],
    })
    expect(saved.portraits[0]).toMatchObject(portrait)
  })
})
test('passages reject malformed paths instead of producing cracked geometry', () => {
  for (const path of [[], [[0, 0]], [[0, 0], [0, 0]], [[0, 0], [1, 1]], [[0, 0], [Number.NaN, 1]]] as Array<Array<[number, number]>>) {
    expect(() => new Passage('bad', 'lodge', path, 0)).toThrow(RangeError)
  }
})
test('faceted timber portals keep their centerlines and level elbows open', () => {
  const material = new MeshBasicMaterial({side: DoubleSide})
  const timber = [TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts), TimberGeometry.stairs(corridorStairs)]
  try {
    const meshes = timber.flatMap(geometry => [geometry.shell, geometry.ribs].map(part => new Mesh(part, material)))
    for (const mesh of meshes) {
      for (const attribute of Object.values(mesh.geometry.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
      mesh.updateMatrixWorld()
    }
    const segments: Array<[Vec3, Vec3]> = [
      ...corridorPassage.spans.map(({start, end}): [Vec3, Vec3] => [[start[0], lodge.floorY + 1.6, start[1]], [end[0], lodge.floorY + 1.6, end[1]]]),
      [[corridorStairs.end[0], lodge.floorY + 1.6, lodge.siennaZ], [-20, 1.6, lodge.siennaZ]],
    ]
    for (const [start, end] of segments) {
      const origin = new Vector3(...start)
      const direction = new Vector3(...end).sub(origin)
      const ray = new Raycaster(origin, direction.clone().normalize(), 0, direction.length())
      expect(ray.intersectObjects(meshes)).toHaveLength(0)
    }
    // The faceted roof really closes the passage above the player.
    const upward = new Raycaster(new Vector3(lodge.approachX, lodge.floorY + 1.6, -20), new Vector3(0, 1, 0))
    const hit = upward.intersectObjects(meshes)[0]
    expect(hit.distance).toBeGreaterThan(1.5)
    expect(hit.distance).toBeLessThanOrEqual(1.81)
  } finally {
    material.dispose()
    for (const geometry of timber) {
      geometry.dispose()
    }
  }
})
test('timber geometry handles trimmed-away spans and rejects invalid inputs', () => {
  const empty = new TimberGeometry([
    {
      start: [0, 0, 0],
      end: [0, 0, 1],
      width: 2.6,
      height: 3.4,
      from: 0.8,
      to: 0.2,
    },
  ])
  try {
    expect(empty.shell.getAttribute('position')).toBeUndefined()
    expect(empty.ribs.getAttribute('position')).toBeUndefined()
  } finally {
    empty.dispose()
  }
  for (const end of [[0, 0, 0], [0, Number.NaN, 1]] as Array<Vec3>) {
    expect(() => new TimberGeometry([
      {
        start: [0, 0, 0],
        end,
        width: 2.6,
        height: 3.4,
      },
    ])).toThrow(RangeError)
  }
  for (const [width, radius] of [[0, 0.3], [2, 0], [Number.NaN, 0.3], [2, Number.POSITIVE_INFINITY]]) {
    expect(() => new StairCarpetGeometry(width, radius)).toThrow(RangeError)
  }
  for (const entryProjection of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => new TimberGeometry([
      {
        start: [0, 0, 0],
        end: [0, 0, 2],
        width: 2.6,
        height: 3.4,
        entryProjection,
      },
    ])).toThrow(RangeError)
  }
})
