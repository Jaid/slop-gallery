import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {DoubleSide, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {cabin, cabinApproach, cabinPassages, cabinRails, cabinStairs, cabinTunnel, cabinWindowRibCutouts, insideCabinRoute} from '../../src/lib/gallery/cabin.ts'
import {CabinWindowGeometry} from '../../src/lib/gallery/CabinWindowGeometry.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {glasswellTower} from '../../src/lib/gallery/glasswellTower.ts'
import {glasswellPlatform} from '../../src/lib/gallery/lowerGallery.ts'
import {Passage} from '../../src/lib/gallery/passages/Passage.ts'
import {TimberGeometry} from '../../src/lib/gallery/passages/TimberGeometry.ts'
import {VaultGeometry} from '../../src/lib/gallery/passages/VaultGeometry.ts'
import {StairCarpetGeometry} from '../../src/lib/gallery/stairs/StairCarpetGeometry.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {floorHeight, insideGallery, placementIssue, roomAt, rooms, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const routeWalls = walls.filter(wall => wall.room === 'cabin' || ['amber-west', 'glasswell-north', 'cabinet-west'].includes(wall.id))
const architecture = routeWalls.map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const windowGeometry = new CabinWindowGeometry
const vaults = [new VaultGeometry(cabinTunnel), TimberGeometry.passage(cabinApproach, cabinWindowRibCutouts), TimberGeometry.stairs(cabinStairs)]
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
  for (const passage of cabinPassages) {
    for (const {center: [x, z], size: [width, depth]} of passage.floors) {
      box([x, passage.floorY - 0.12, z], [width, 0.24, depth])
      box([x, passage.floorY + passage.height + 0.12, z], [width, 0.24, depth])
    }
  }
  for (const block of cabinStairs.blocks) {
    box(block.position, block.size)
  }
  for (const beam of cabinRails) {
    box(beam.position, beam.size).setRotation((new Quaternion).setFromEuler(new Euler(...beam.rotation)))
  }
  box(glasswellPlatform.position, glasswellPlatform.size)
  box([cabin.center[0], cabin.floorY - 0.15, cabin.center[1]], [10, 0.3, 10])
  box([cabin.center[0], cabin.floorY + cabin.height + 0.12, cabin.center[1]], [10, 0.24, 10])
  box([-14, -0.15, 14], [12, 0.3, 12])
  box([-14, 5.9, 14], [12, 0.3, 12])
  box([-28.7, cabin.floorY + 0.52, -29.5], [0.85, 0.23, 3.3])
  box([-29.06, cabin.floorY + 0.95, -29.5], [0.13, 0.52, 3.3])
  box([-25, cabin.floorY + 0.7, -32.3], [2.5, 0.25, 1.05])
  box([-25, cabin.floorY + 0.1, -26.65], [3.8, 0.2, 1.2])
  return world
}
describe('Cabin route', () => {
  test('the timber tunnel keeps its 400 cm span and stays clear of room corners', () => {
    expect(cabinApproach.width).toBe(4)
    expect(cabinStairs.width).toBe(cabinApproach.width)
    expect(cabin.approachX + cabinApproach.width / 2).toBeCloseTo(-31.7)
    for (const id of ['amber-west', 'cabin-west']) {
      const wall = walls.find(value => value.id === id)!
      const hole = wall.holes![0]!
      expect(hole.width).toBe(cabinApproach.width)
      expect(Math.abs(hole.u) + hole.width / 2 + 0.17).toBeLessThan(wall.width / 2)
    }
    const material = new MeshBasicMaterial
    const geometry = TimberGeometry.passage(cabinApproach, cabinWindowRibCutouts)
    try {
      const meshes = [geometry.shell, geometry.ribs].map(part => new Mesh(part, material))
      for (const z of [-28, -20, 0, 7]) {
        for (const side of [-1, 1]) {
          const x = cabin.approachX + side * (cabinApproach.width / 2 - 0.3)
          expect(cabinApproach.floorAt(x, z)).toBe(cabin.floorY)
          expect(insideCabinRoute([x, cabin.floorY + 1.6, z])).toBe(true)
          expect(cabinApproach.floorAt(cabin.approachX + side * (cabinApproach.width / 2 + 0.01), z)).toBeUndefined()
          const hit = new Raycaster(new Vector3(cabin.approachX, cabin.floorY + 1.6, z), new Vector3(side, 0, 0)).intersectObjects(meshes)[0]!
          expect(hit.distance).toBeGreaterThan(cabinApproach.width / 2 - 0.26)
          expect(hit.distance).toBeLessThan(cabinApproach.width / 2 - 0.08)
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
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cabin.approachX + offset, cabin.floorY + 0.04, start))
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
          expect(body.translation().x).toBeCloseTo(cabin.approachX + offset, 2)
          expect(body.translation().y).toBeCloseTo(cabin.floorY + 0.02, 2)
          expect(motor.grounded).toBe(true)
        } finally {
          motor.dispose()
          world.free()
        }
      })
    }
  }
  test('the stone entrance and both passage mouths match the tower diameter with clear corner trim', () => {
    expect(cabinTunnel.width).toBe(glasswellTower.radius * 2)
    expect(cabinTunnel.width).toBe(4.4)
    for (const id of ['glasswell-north', 'cabin-east']) {
      const wall = walls.find(value => value.id === id)!
      const hole = wall.holes![0]!
      expect(hole.width).toBe(cabinTunnel.width)
      expect(hole.height - (hole.bottom ?? 0)).toBeCloseTo(cabinTunnel.height)
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
        ...[vaults[0]!.shell, vaults[0]!.ribs].map(geometry => new Mesh(geometry, material)),
      ]
      for (const offset of [-1.65, 1.65]) {
        const x = cabin.entranceX + offset
        expect(cabinTunnel.floorAt(x, cabin.entranceZ - 0.5)).toBe(cabin.floorY)
        expect(insideGallery([x, cabin.floorY + 1.6, cabin.entranceZ - 0.5])).toBe(true)
        const ray = new Raycaster(new Vector3(x, cabin.floorY + 1.7, cabin.entranceZ + 0.5), new Vector3(0, 0, -1), 0, cabin.entranceZ - cabin.tunnelZ + 0.5)
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
          const path = entrance ? [[cabin.entranceX + offset, cabin.entranceZ + 1], [cabin.entranceX + offset, cabin.tunnelZ]] : [[-18.5, cabin.tunnelZ + offset], [-23, cabin.tunnelZ + offset]]
          if (returning) {
            path.reverse()
          }
          const [start, end] = path as [[number, number], [number, number]]
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0], cabin.floorY + 0.04, start[1]))
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
            expect(body.translation().y).toBeCloseTo(cabin.floorY + 0.02, 2)
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
    expect(cabin.floorY).toBe(-5)
    expect(cabin.entranceX).toBe(glasswellTower.x)
    expect(rooms.find(room => room.id === 'cabin')!.number).toBe('08')
    for (const passage of cabinPassages) {
      for (const {center: [x, z]} of passage.floors) {
        const position: Vec3 = [x, passage.floorY + 1.6, z]
        expect(insideCabinRoute(position)).toBe(true)
        expect(insideGallery(position)).toBe(true)
        expect(roomAt(position)).toBe('cabin')
        expect(floorHeight(position)).toBeCloseTo(passage.floorY)
      }
    }
    for (const block of cabinStairs.blocks) {
      expect(floorHeight([block.position[0], block.top + 1.6, block.position[2]])).toBeCloseTo(block.top)
    }
    expect(insideGallery([-18, -3.4, -20])).toBe(false)
    expect(insideGallery([-25, -6.01, -20])).toBe(false)
  })
  test('the Glasswell entrance starts at its platform, not at the buried lower floor', () => {
    const wall = walls.find(candidate => candidate.id === 'glasswell-north')!
    expect(wall.center[1] + wall.holes![0]!.bottom!).toBe(cabin.floorY)
    expect(wallPosition(wall, wall.holes![0]!.u, cabin.floorY, 0)).toEqual([cabin.entranceX, cabin.floorY, cabin.entranceZ])
    const amber = walls.find(candidate => candidate.id === 'amber-west')!
    expect(wallPosition(amber, amber.holes![0]!.u, 0, 0)[2]).toBeCloseTo(cabin.amberZ)
    expect(amber.holes![0]!.u + cabin.timberWidth / 2 + 0.17).toBeLessThan(amber.width / 2)
    const west = walls.find(candidate => candidate.id === 'cabin-west')!
    expect(wallPosition(west, west.holes![0]!.u, cabin.floorY, 0)).toEqual([-30, cabin.floorY, cabin.returnZ])
    expect(walls.find(candidate => candidate.id === 'cabin-south')!.holes).toBeUndefined()
  })
  test('Amber opens directly onto descending treads with half-round pads contained on every step', () => {
    const first = cabinStairs.blocks[0]!
    expect(first.tread).toBe(true)
    expect(first.top).toBeLessThan(0)
    expect(first.position[0] + first.size[0] / 2).toBe(-20)
    expect(cabinStairs.axis).toBe(0)
    const radius = Math.min(0.38, cabinStairs.run - 0.05)
    const carpet = new StairCarpetGeometry(cabinStairs.width - 0.5, radius)
    try {
      const bounds = carpet.boundingBox!
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(cabinStairs.width - 0.5)
      expect(bounds.min.z).toBeCloseTo(-radius)
      expect(bounds.max.z).toBeCloseTo(0)
      expect(bounds.max.y).toBeCloseTo(0.008)
      expect(bounds.max.x).toBeLessThan(cabinStairs.width / 2 - 0.2)
      carpet.rotateY(Math.PI / 2)
      carpet.computeBoundingBox()
      expect(carpet.boundingBox!.max.x).toBeCloseTo(0)
      expect(carpet.boundingBox!.min.x).toBeCloseTo(-radius)
      for (const block of cabinStairs.blocks.filter(step => step.tread)) {
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
          const path = [[cabin.entranceX, -29], [cabin.entranceX, cabin.tunnelZ], [-28, cabin.tunnelZ], [-28, cabin.returnZ], [cabin.approachX, cabin.returnZ], [cabin.approachX, cabin.amberZ], [-31, cabin.amberZ], [-18.5, cabin.amberZ]]
          if (returning) {
            path.reverse()
          }
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0]![0]!, (returning ? 0 : cabin.floorY) + 0.04, path[0]![1]!))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = new Quaternion
          try {
            let target = 1
            for (let i = 0; i < fps * 80 && target < path.length; i++) {
              const position = body.translation()
              const dx = path[target]![0]! - position.x
              const dz = path[target]![1]! - position.z
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
            expect(body.translation().y).toBeCloseTo((returning ? cabin.floorY : 0) + 0.02, 2)
            expect(motor.grounded).toBe(true)
          } finally {
            motor.dispose()
            world.free()
          }
        })
      }
    }
  }
  test('new openings preserve saved artwork as reachable loose frames, without mutating backups', () => {
    for (const [id, u, y] of [['daydream-north', 0, 2.65], ['glasswell-north', cabin.entranceX, -3], ['amber-west', 14 - cabin.amberZ, 2.5], ['cabin-west', cabin.center[1] - cabin.returnZ, -2.9]] as const) {
      const wall = walls.find(candidate => candidate.id === id)!
      const portrait = {
        ...initialPortraits[0]!,
        id: 'saved-doorway-art',
        title: 'Keep this custom title',
        width: 1,
        height: 1,
        wallId: id,
        position: wallPosition(wall, u, y),
        rotation: wall.rotation,
      }
      expect(placementIssue(wall, portrait.position, portrait.width, portrait.height, [])).toContain('doorway')
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      const restored = saved.portraits[0]!
      expect(restored.hung).toBe(false)
      expect(restored.title).toBe(portrait.title)
      expect(restored.source).toBe(portrait.source)
      expect(insideGallery(restored.position)).toBe(true)
      expect(restored.position[1] - floorHeight(restored.position)).toBeCloseTo(0.2)
      expect(validateDocument(saved)).toEqual(saved)
      expect(portrait.hung).toBe(true)
    }
  })
  test('the new room accepts hanging and loose artwork in backups', () => {
    const wall = walls.find(candidate => candidate.id === 'cabin-north')!
    const portrait = {
      ...initialPortraits[0]!,
      wallId: wall.id,
      position: wallPosition(wall, -2.5, cabin.floorY + 2.1),
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
  test('loose frames in the removed return corridor recover inside the Cabin', () => {
    const portrait = {
      ...initialPortraits[0]!,
      hung: false,
      position: [-25, -4.8, -20] as Vec3,
    }
    const saved = validateDocument({
      ...createDocument(),
      portraits: [portrait],
    })
    expect(saved.portraits[0]!.position).toEqual([-25, -4.8, -28.5])
    expect(saved.portraits[0]!.source).toBe(portrait.source)
    expect(portrait.position).toEqual([-25, -4.8, -20])
    expect(validateDocument(saved)).toEqual(saved)
  })
})
test('passages reject malformed paths instead of producing cracked geometry', () => {
  for (const path of [[], [[0, 0]], [[0, 0], [0, 0]], [[0, 0], [1, 1]], [[0, 0], [Number.NaN, 1]]] as Array<Array<[number, number]>>) {
    expect(() => new Passage('bad', 'cabin', path, 0)).toThrow(RangeError)
  }
})
test('faceted timber portals keep their centerlines and level elbows open', () => {
  const material = new MeshBasicMaterial({side: DoubleSide})
  const timber = [TimberGeometry.passage(cabinApproach, cabinWindowRibCutouts), TimberGeometry.stairs(cabinStairs)]
  try {
    const meshes = timber.flatMap(geometry => [geometry.shell, geometry.ribs].map(part => new Mesh(part, material)))
    for (const mesh of meshes) {
      for (const attribute of Object.values(mesh.geometry.attributes)) {
        expect([...attribute.array].every(Number.isFinite)).toBe(true)
      }
      mesh.updateMatrixWorld()
    }
    const segments: Array<[Vec3, Vec3]> = [
      ...cabinApproach.spans.map(({start, end}): [Vec3, Vec3] => [[start[0], cabin.floorY + 1.6, start[1]], [end[0], cabin.floorY + 1.6, end[1]]]),
      [[cabinStairs.end[0], cabin.floorY + 1.6, cabin.amberZ], [-20, 1.6, cabin.amberZ]],
    ]
    for (const [start, end] of segments) {
      const origin = new Vector3(...start)
      const direction = new Vector3(...end).sub(origin)
      const ray = new Raycaster(origin, direction.clone().normalize(), 0, direction.length())
      expect(ray.intersectObjects(meshes)).toHaveLength(0)
    }
    // The faceted roof really closes the passage above the player.
    const upward = new Raycaster(new Vector3(cabin.approachX, cabin.floorY + 1.6, -20), new Vector3(0, 1, 0))
    const hit = upward.intersectObjects(meshes)[0]!
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
    expect(() => new StairCarpetGeometry(width!, radius!)).toThrow(RangeError)
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
