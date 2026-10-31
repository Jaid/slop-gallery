import type {Vec3} from '../../src/lib/gallery/types.ts'

import {afterAll, describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import EgoMotor from 'ego-player/motor'
import {DoubleSide, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {corridorEndZ, corridorPassage, corridorRails, corridorRunner, corridorStairs, insideCorridor, lodgeThreshold, lodgeThresholdSaddle} from '../../src/lib/gallery/corridor.ts'
import {insidePolygon, polygonCentroid, rectanglePolygon, slabCorners} from '../../src/lib/gallery/floorPolygons.ts'
import {fortressApproach, fortressDoorway, fortressMouth, fortressTransition} from '../../src/lib/gallery/fortress.ts'
import {insideFortress} from '../../src/lib/gallery/fortressNetwork.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import lodge, {insideLodgeWindow, lodgeBay, lodgeBayFloor, lodgeOutline, lodgeWindowRibCutouts} from '../../src/lib/gallery/lodge.ts'
import lodgeInterior, {lodgeFurnitureColliders} from '../../src/lib/gallery/lodgeInterior/layout.ts'
import LodgeWindowGeometry from '../../src/lib/gallery/LodgeWindowGeometry.ts'
import {towerBridge} from '../../src/lib/gallery/oculusTower.ts'
import Passage from '../../src/lib/gallery/passages/Passage.ts'
import SaddleGeometry from '../../src/lib/gallery/passages/SaddleGeometry.ts'
import TimberGeometry from '../../src/lib/gallery/passages/TimberGeometry.ts'
import TransitionGeometry from '../../src/lib/gallery/passages/TransitionGeometry.ts'
import VaultGeometry from '../../src/lib/gallery/passages/VaultGeometry.ts'
import StairRunner from '../../src/lib/gallery/stairs/StairRunner.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {placementIssue, wallPosition} from '../../src/lib/placement/wallGeometry.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import walls, {floorHeight, insideGallery} from './fixtures/gallery.ts'
import samplePortraits from './fixtures/portraits.ts'

await RAPIER.init()
const routePassages = [fortressApproach, corridorPassage] as const
const insideRoute = (position: Vec3) => insideLodgeWindow(position) || insideFortress(position) || insideCorridor(position)
const routeWalls = walls.filter(wall => ['corridor', 'lodge'].includes(wall.room) || wall.id.startsWith('fortress-approach_') || ['sienna-west', 'vesper-west'].includes(wall.id))
const architecture = routeWalls.map(wall => ({
  wall,
  geometry: createArchitectureGeometry(wall),
}))
const windowGeometry = new LodgeWindowGeometry
const transition = new TransitionGeometry(fortressTransition)
const vaults = [new VaultGeometry(fortressApproach, fortressTransition.length), TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts), TimberGeometry.stairs(corridorStairs)]
const thresholdSaddle = SaddleGeometry.across(lodgeThresholdSaddle, corridorPassage.floorY)
const saddles = [transition.sill, thresholdSaddle]
afterAll(() => {
  windowGeometry.dispose()
  transition.dispose()
  thresholdSaddle.dispose()
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
      const wallRotation = new Quaternion
      world.createCollider(RAPIER.ColliderDesc.trimesh(...args).setTranslation(...wall.center).setRotation(wallRotation.setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
    }
  }
  for (const vault of vaults) {
    for (const geometry of [vault.shell, vault.ribs]) {
      world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
    }
  }
  for (const geometry of [windowGeometry.lining, windowGeometry.glass, windowGeometry.frame, transition.timber, transition.lining]) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
  }
  const box = (position: Vec3, size: Vec3) => world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position))
  for (const passage of routePassages) {
    for (const floor of passage.floors) {
      world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, passage.floorY - 0.24, passage.floorY))!)
      world.createCollider(RAPIER.ColliderDesc.convexHull(slabCorners(floor, passage.floorY + passage.height, passage.floorY + passage.height + 0.24))!)
    }
  }
  for (const block of corridorStairs.blocks) {
    box(block.position, block.size)
  }
  for (const beam of corridorRails) {
    const beamRotation = new Quaternion
    box(beam.position, beam.size).setRotation(beamRotation.setFromEuler(new Euler(...beam.rotation)))
  }
  // The Lodge’s floor and ceiling slabs over its plan with the bay, and both saddles, as hulls like the room mounts them.
  const slab = (bottom: number, top: number) => world.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(lodgeOutline.flatMap(([x, z]) => [x, bottom, z, x, top, z])))!)
  slab(lodge.floorY - 0.3, lodge.floorY)
  slab(lodge.floorY + lodge.height, lodge.floorY + lodge.height + 0.24)
  for (const saddle of saddles) {
    world.createCollider(RAPIER.ColliderDesc.convexHull(saddle.getAttribute('position').array as Float32Array)!)
  }
  box([-14, -0.15, 14], [12, 0.3, 12])
  box([-14, 5.9, 14], [12, 0.3, 12])
  // The Lodge’s furniture, window seat and hearth, as the room mounts them.
  for (const {position, yaw, size} of lodgeFurnitureColliders()) {
    const turn = new Quaternion
    box([lodge.center[0] + position[0], lodge.floorY + position[1] + size[1] / 2, lodge.center[1] + position[2]], size).setRotation(turn.setFromAxisAngle(new Vector3(0, 1, 0), yaw))
  }
  const {windowSeat, fireplace} = lodgeInterior
  box([lodge.center[0] + windowSeat.position[0], lodge.floorY + 0.5, lodge.center[1] + windowSeat.position[2]], [0.85, 1, windowSeat.length])
  box([lodge.center[0], lodge.floorY + fireplace.hearth.size[1] / 2, lodge.center[1] + fireplace.hearth.z], fireplace.hearth.size)
  return world
}
describe('Lodge and Corridor route', () => {
  test('the timber tunnel keeps its 400 cm span and stays clear of room corners', () => {
    expect(corridorPassage.width).toBe(4)
    expect(corridorStairs.width).toBe(corridorPassage.width)
    expect(lodge.approachX + corridorPassage.width / 2).toBeCloseTo(-31.7)
    for (const id of ['sienna-west', 'lodge-north']) {
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
          const lateralRay = new Raycaster(new Vector3(lodge.approachX, lodge.floorY + 1.6, z), new Vector3(side, 0, 0))
          const hit = lateralRay.intersectObjects(meshes)[0]
          expect(hit.distance).toBeGreaterThan(corridorPassage.width / 2 - 0.26)
          expect(hit.distance).toBeLessThan(corridorPassage.width / 2 - 0.08)
        }
      }
    } finally {
      geometry.dispose()
      material.dispose()
    }
  })
  test('the timber lining closes the corners behind its knees where it stops at an elbow', () => {
    const material = new MeshBasicMaterial
    const geometry = TimberGeometry.passage(corridorPassage, lodgeWindowRibCutouts)
    try {
      const meshes = [geometry.shell, geometry.ribs].map(part => new Mesh(part, material))
      const half = corridorPassage.width / 2
      const {spans} = corridorPassage
      // From inside each open elbow, 20 cm before each adjoining lining end, look into it, high in the corner between wall, ceiling and chamfer.
      const ends = spans.slice(1).flatMap((after, i) => [[spans[i], spans[i].to + 0.2, -1], [after, after.from - 0.2, 1]] as const)
      for (const [{start, end, length}, along, toward] of ends) {
        const [dx, dz] = [(end[0] - start[0]) / length, (end[1] - start[1]) / length]
        for (const side of [-1, 1]) {
          const origin = new Vector3(start[0] + dx * along - dz * side * (half - 0.25), lodge.floorY + corridorPassage.height - 0.15, start[1] + dz * along + dx * side * (half - 0.25))
          const ray = new Raycaster(origin, new Vector3(dx * toward, 0, dz * toward))
          const hit = ray.intersectObjects(meshes)[0]
          expect(hit).toBeDefined()
          expect(hit.distance).toBeGreaterThan(0.15)
          expect(hit.distance).toBeLessThan(0.25)
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
        const facing = new Quaternion
        facing.setFromAxisAngle(new Vector3(0, 1, 0), returning ? 0 : Math.PI)
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
  test('both doorways of the Fortress are as wide and as high as the passages behind them, with clear corner trim', () => {
    expect(fortressApproach.width).toBe(towerBridge.mouthWidth)
    expect(fortressApproach.width).toBe(4)
    for (const [id, name, floorY, passage] of [['oculus-east', 'fortress', fortressDoorway.y, fortressMouth], ['lodge-east', 'fortress', lodge.floorY, fortressApproach]] as const) {
      const wall = walls.find(value => value.id === id)!
      const hole = wall.holes!.find(value => value.name === name)!
      expect(hole.width).toBe(passage.width)
      expect(wall.center[1] + hole.height - floorY).toBeCloseTo(passage.height)
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
      // Through the Lodge’s doorway, at a person’s height and a little off the axis on both sides
      for (const offset of [-1.45, 1.45]) {
        const z = lodge.tunnelZ + offset
        expect(fortressApproach.floorAt(-19.5, z)).toBe(lodge.floorY)
        expect(insideGallery([-19.5, lodge.floorY + 1.6, z])).toBe(true)
        const ray = new Raycaster(new Vector3(-18.5, lodge.floorY + 1.7, z), new Vector3(-1, 0, 0), 0, 3)
        expect(ray.intersectObjects(meshes)).toHaveLength(0)
      }
    } finally {
      material.dispose()
    }
  })
  for (const offset of [-1.45, 1.45]) {
    for (const returning of [false, true]) {
      test(`the widened stone doorway is walkable at offset ${offset}, returning ${returning}`, () => {
        const world = createWorld(60)
        const path = [[-18.5, lodge.tunnelZ + offset], [-23, lodge.tunnelZ + offset]]
        if (returning) {
          path.reverse()
        }
        const [start, end] = path as [[number, number], [number, number]]
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0], lodge.floorY + 0.04, start[1]))
        const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
        const motor = new EgoMotor(RAPIER, world, body, collider)
        const facing = new Quaternion
        facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(start[0] - end[0], start[1] - end[1]))
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
  test('navigation and floors share the passages’ elevation', () => {
    expect(lodge.floorY).toBe(-5)
    const threshold = rectanglePolygon(lodgeThreshold)
    for (const passage of routePassages) {
      for (const floor of passage.floors) {
        // Its middle, and halfway from there to each of its corners
        const [x, z] = polygonCentroid(floor)
        for (const [px, pz] of [[x, z], ...floor.map(([cx, cz]) => [(x + cx) / 2, (z + cz) / 2])]) {
          // The doorway passage from the Corridor is the Lodge’s up to its middle, but neither’s right there.
          if (passage === corridorPassage && Math.abs(pz - corridorEndZ) < 0.01) {
            continue
          }
          const position: Vec3 = [px, passage.floorY + 1.6, pz]
          expect(insideRoute(position)).toBe(true)
          expect(insideGallery(position)).toBe(true)
          // The Lodge owns its half of the doorway passage from the Corridor.
          expect(slopGallery.roomAt(position)?.id).toBe(passage === corridorPassage && insidePolygon(threshold, px, pz) ? 'lodge' : passage.room)
          expect(floorHeight(position)).toBeCloseTo(passage.floorY)
        }
      }
    }
    for (const block of corridorStairs.blocks) {
      const position: Vec3 = [block.position[0], block.top + 1.6, block.position[2]]
      expect(slopGallery.roomAt(position)?.id).toBe('corridor')
      expect(floorHeight(position)).toBeCloseTo(block.top)
    }
    expect(insideGallery([-18, -3.4, -20])).toBe(false)
    expect(insideGallery([-25, -6.01, -20])).toBe(false)
  })
  test('the north bay is half an octagon, half as deep as the run from the tunnel portal’s jamb to the south-east corner', () => {
    // The two points Jaid measured between: the portal’s south jamb and the south-east corner of the log faces.
    expect(Math.hypot(-20.028 - -20.103, -35.59 - -30.105) / 2).toBeCloseTo(lodgeBay.depth, 2)
    const [northWest, back, northEast] = ['lodge-northwest', 'lodge-north', 'lodge-northeast'].map(id => walls.find(wall => wall.id === id)!)
    expect([northWest.rotation, back.rotation, northEast.rotation]).toEqual([Math.PI / 4, 0, -Math.PI / 4])
    expect(northWest.width).toBeCloseTo(lodgeBay.depth * Math.SQRT2)
    expect(northEast.width).toBeCloseTo(lodgeBay.depth * Math.SQRT2)
    expect(back.width).toBeCloseTo(lodge.size[0] - 2 * lodgeBay.depth)
    expect(back.center[2]).toBeCloseTo(lodge.center[1] - lodge.size[1] / 2 - lodgeBay.depth)
    // The diagonals start at the corners of the west wall and beside the tunnel’s doorway.
    expect(wallPosition(northWest, -northWest.width / 2, 0, 0)).toEqual([expect.closeTo(lodge.center[0] - lodge.size[0] / 2), 0, expect.closeTo(lodge.center[1] - lodge.size[1] / 2)])
    expect(wallPosition(northEast, northEast.width / 2, 0, 0)).toEqual([expect.closeTo(lodge.center[0] + lodge.size[0] / 2), 0, expect.closeTo(lodge.center[1] - lodge.size[1] / 2)])
    // Its floor belongs to the Lodge up to its walls, not in the corners they cut off.
    const inside: Vec3 = [lodge.center[0], lodge.floorY + 1.6, back.center[2] + 0.3]
    expect(slopGallery.roomAt(inside)?.id).toBe('lodge')
    expect(insideGallery(inside)).toBe(true)
    expect(floorHeight(inside)).toBe(lodge.floorY)
    const cutOff: Vec3 = [lodge.center[0] - lodge.size[0] / 2 + 0.3, lodge.floorY + 1.6, back.center[2] + 0.3]
    expect(lodgeBayFloor(cutOff[0], cutOff[2])).toBeUndefined()
    expect(insideGallery(cutOff)).toBe(false)
  })
  // Straight north, the Corridor’s doorway takes up nearly all of the back wall.
  for (const [label, heading] of [['north-west', Math.PI / 4], ['north-east', -Math.PI / 4]] as const) {
    test(`a player walking ${label} into the bay is stopped by its wall, on level floor`, () => {
      const world = createWorld(60)
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(lodge.center[0], lodge.floorY + 0.04, lodge.tunnelZ))
      const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
      const motor = new EgoMotor(RAPIER, world, body, collider)
      const facing = new Quaternion
      facing.setFromAxisAngle(new Vector3(0, 1, 0), heading)
      try {
        for (let i = 0; i < 60 * 5; i++) {
          motor.step(world.timestep, {forward: true}, facing)
          world.step()
        }
        const {x, y, z} = body.translation()
        // At the wall the bay faces along the heading, a capsule radius in front of its logs.
        const wall = walls.find(candidate => candidate.id === `lodge-${label.replace('-', '')}`)!
        const clearance = (x - wall.center[0]) * Math.sin(wall.rotation) + (z - wall.center[2]) * Math.cos(wall.rotation)
        expect(clearance).toBeGreaterThan(0.3 + 0.105 - 0.03)
        expect(clearance).toBeLessThan(0.3 + 0.25 + 0.05)
        expect(lodgeBayFloor(x, z)).toBe(lodge.floorY)
        expect(y).toBeCloseTo(lodge.floorY + 0.02, 2)
        expect(motor.grounded).toBe(true)
      } finally {
        motor.dispose()
        world.free()
      }
    })
  }
  test('the Lodge furniture leaves the walkway between both doorways clear', () => {
    // The loop walks along z = tunnelZ from the tunnel doorway to the middle of the room and north from there to the corridor doorway in the bay; a 0.3 m capsule needs room on both sides.
    const walkway = lodge.tunnelZ - lodge.center[1]
    for (const {position, yaw, size} of lodgeFurnitureColliders()) {
      const reach = Math.abs(Math.sin(yaw)) * size[0] / 2 + Math.abs(Math.cos(yaw)) * size[2] / 2
      expect(position[2] - reach).toBeGreaterThanOrEqual(lodgeInterior.walkwayEdge)
      expect(position[2] - reach - walkway).toBeGreaterThan(0.9)
      // Everything stays inside the room’s walls.
      const halfX = Math.abs(Math.cos(yaw)) * size[0] / 2 + Math.abs(Math.sin(yaw)) * size[2] / 2
      expect(Math.abs(position[0]) + halfX).toBeLessThan(lodge.size[0] / 2 - 0.105)
      expect(position[2] + reach).toBeLessThan(lodge.size[1] / 2 - 0.105)
      // Nothing stands in front of the window seat.
      const {windowSeat} = lodgeInterior
      expect(position[0] - halfX).toBeGreaterThan(windowSeat.position[0] + 0.425 + 0.3)
      // Nothing stands inside the chimney breast.
      const {fireplace} = lodgeInterior
      expect(Math.abs(position[0]) - halfX >= fireplace.width / 2 || position[2] + reach <= fireplace.front).toBe(true)
    }
  })
  test('the Fortress’ doorway in the Oculus opens at the east bridge’s end, its sill just under the deck', () => {
    const wall = walls.find(candidate => candidate.id === 'oculus-east')!
    const hole = wall.holes!.find(value => value.name === 'fortress')!
    expect(wall.center[1] + hole.bottom!).toBeCloseTo(fortressDoorway.y - 0.02)
    expect(wallPosition(wall, hole.u, fortressDoorway.y, 0)).toEqual([expect.closeTo(fortressDoorway.x), fortressDoorway.y, expect.closeTo(fortressDoorway.z)])
    const sienna = walls.find(candidate => candidate.id === 'sienna-west')!
    expect(wallPosition(sienna, sienna.holes![0].u, 0, 0)[2]).toBeCloseTo(lodge.siennaZ)
    expect(sienna.holes![0].u + lodge.timberWidth / 2 + 0.17).toBeLessThan(sienna.width / 2)
    // The Corridor leaves the Lodge through the middle of the bay’s back wall; only the window looks out of the west wall into it.
    const north = walls.find(candidate => candidate.id === 'lodge-north')!
    const [doorwayX, doorwayZ] = corridorPassage.path[0]
    expect(wallPosition(north, north.holes!.find(value => value.name === 'corridor')!.u, lodge.floorY, 0)).toEqual([expect.closeTo(doorwayX), lodge.floorY, expect.closeTo(doorwayZ)])
    expect(doorwayX).toBe(lodge.center[0])
    expect(walls.find(candidate => candidate.id === 'lodge-west')!.holes!.map(value => value.name)).toEqual(['window'])
    expect(walls.find(candidate => candidate.id === 'lodge-south')!.holes).toBeUndefined()
  })
  test('Sienna opens directly onto descending treads with a continuous runner inset between the handrails', () => {
    const first = corridorStairs.blocks[0]
    expect(first.tread).toBe(true)
    expect(first.top).toBeLessThan(0)
    expect(first.position[0] + first.size[0] / 2).toBe(-20)
    expect(corridorStairs.axis).toBe(0)
    // Rod finials stay on bare oak, inside the handrail posts.
    const railOffset = Math.abs(corridorRails[0].position[2] - lodge.siennaZ)
    expect(corridorRunner.finialOffset + corridorRunner.finialRadius).toBeLessThan(railOffset - 0.1)
    expect(corridorRunner.halfWidth).toBeLessThan(corridorStairs.width / 2 - 0.4)
    // Rods sit on every tread, behind its center, and nosings fit within the rise.
    expect(corridorRunner.rodCenter + corridorRunner.rodRadius).toBeLessThan(corridorStairs.run / 4)
    expect(corridorRunner.nosingRadius + corridorRunner.thickness).toBeLessThan(corridorStairs.rise / 4)
    // The path runs across a tread, then down its riser, without gaps or overlaps between steps.
    for (let step = 0; step < corridorStairs.count - 1; step++) {
      expect(corridorRunner.pathDistance(step, 'riser', corridorStairs.rise)).toBeCloseTo(corridorRunner.pathDistance(step + 1, 'tread', 0))
      expect(corridorRunner.pathDistance(step, 'tread', corridorStairs.run)).toBeCloseTo(corridorRunner.pathDistance(step, 'riser', 0))
    }
  })
  for (const fps of [30, 60, 120]) {
    for (const returning of [false, true]) {
      for (const sprint of [false, true]) {
        test(`real player traverses the entire loop at ${fps} Hz, returning ${returning}, sprint ${sprint}`, () => {
          const world = createWorld(fps)
          // From the flat planks beyond the Fortress’ raised timber saddle into the Lodge, north through its bay and round it along the Corridor.
          const path = [[fortressApproach.path.at(-1)![0] + 0.4, lodge.tunnelZ], [lodge.center[0], lodge.tunnelZ], ...corridorPassage.path, [-18.5, lodge.siennaZ]]
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
  test('the new room accepts hanging and loose artwork in backups, on the bay’s 45° walls too', () => {
    const wall = walls.find(candidate => candidate.id === 'lodge-northwest')!
    const portrait = {
      ...samplePortraits[0],
      wallId: wall.id,
      position: wallPosition(wall, 0.5, lodge.floorY + 2.1),
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
  // Nothing to run along, straight on or doubling back past a right angle, and a span too short for the elbows at its ends
  for (const path of [[], [[0, 0]], [[0, 0], [0, 0]], [[0, 0], [Number.NaN, 1]], [[0, 0], [0, 3], [0, 6]], [[0, 0], [0, 5], [1, 0]], [[0, 0], [0, 5], [1, 5], [1, 10]]] as Array<Array<[number, number]>>) {
    expect(() => new Passage('bad', 'lodge', path, 0)).toThrow(RangeError)
  }
  // Askew of x and z, turning by 45° and by a right angle
  const askew = new Passage('askew', 'lodge', [[0, 0], [3, 3], [3, 8], [8, 8]], 0)
  expect(askew.walls).toHaveLength(6)
  expect(askew.junctions).toHaveLength(2)
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
      const direction = new Vector3(...end)
      direction.sub(origin)
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
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, corridorStairs.width]) {
    expect(() => new StairRunner(corridorStairs, width)).toThrow(RangeError)
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
