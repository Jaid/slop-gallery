import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {BoxGeometry, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {newPortrait} from '../../src/lib/gallery/actions.ts'
import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {stairBlocks, staircase, stairFloorHeight} from '../../src/lib/gallery/staircase.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {findPlacement, floorHeight, insideGallery, placementIssue, roomAt, rooms, roomVisit, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const lower = rooms.find(candidate => candidate.id === 'undertone')!
const upper = rooms.find(candidate => candidate.id === 'antechamber')!
describe('lower gallery', () => {
  test('navigation, room classification and floor bounds include both levels and the staircase', () => {
    expect(upper.title).toBe('The Antechamber')
    expect(roomVisit(lower).position[1]).toBeCloseTo(-1.9)
    for (const block of stairBlocks) {
      const position: Vec3 = [block.position[0], block.top + 1.6, block.position[2]]
      expect(stairFloorHeight(position[0])).toBeCloseTo(block.top)
      expect(floorHeight(position)).toBeCloseTo(block.top)
      expect(insideGallery(position)).toBe(true)
      expect(roomAt(position)).toBe('undertone')
    }
    expect(insideGallery([18, -3.55, 15])).toBe(true)
    expect(insideGallery([18, -4.61, 15])).toBe(false)
    expect(insideGallery([18, 2.41, 15])).toBe(false)
    expect(insideGallery([8, -1, 14])).toBe(false)
    expect(insideGallery([8, -5, 11.5])).toBe(false)
    expect(insideGallery([Number.NaN, -2, 15])).toBe(false)
  })
  test('wall rays and frame/label clearance use world elevation exactly once', () => {
    const wall = walls.find(candidate => candidate.id === 'undertone-south')!
    const position = wallPosition(wall, 2, lower.floorY + 2.5)
    expect(position[1]).toBeCloseTo(-1.1)
    expect(placementIssue(wall, position, 2, 2, [])).toBe('')
    expect(placementIssue(wall, wallPosition(wall, 2, lower.floorY + 1), 2, 2, [])).toContain('label')
    expect(findPlacement([16, -1.1, 18], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: wall.id,
      valid: true,
    })
    expect(findPlacement([14, -2, 11.5], [-1, 0, 0], 1, 1, [])).toBeNull()
    expect(findPlacement([14, -2, 14], [-1, 0, 0], 1, 1, [])?.wallId).toBe('undertone-west')
    expect(findPlacement([8, -0.5, 11.5], [0, 0, -1], 1, 1, [])).toMatchObject({
      valid: false,
      reason: 'Keep the stairway clear.',
    })
  })
  test('legacy wall IDs migrate without replacing custom artwork or mutating the backup', () => {
    for (const side of ['north', 'east', 'south', 'west']) {
      const wall = walls.find(candidate => candidate.id === `antechamber-${side}`)!
      const portrait = {
        ...initialPortraits[0]!,
        title: 'My custom title',
        width: 0.8,
        height: 0.8,
        wallId: `secret-${side}`,
        rotation: wall.rotation,
        position: wallPosition(wall, 2.5, 2.5),
      }
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      expect(saved.portraits[0]).toMatchObject({
        ...portrait,
        wallId: wall.id,
      })
      expect(portrait.wallId).toBe(`secret-${side}`)
      expect(validateDocument(saved)).toEqual(saved)
    }
  })
  test('an old frame covering the new stairway is preserved as a loose, reachable frame', () => {
    const wall = walls.find(candidate => candidate.id === 'antechamber-east')!
    const portrait = {
      ...initialPortraits[0]!,
      title: 'Saved doorway art',
      wallId: 'secret-east',
      rotation: wall.rotation,
      position: wallPosition(wall, 0, 2.5),
    }
    const saved = validateDocument({
      ...createDocument(),
      portraits: [portrait],
    })
    expect(saved.portraits[0]).toMatchObject({
      id: portrait.id,
      title: portrait.title,
      source: portrait.source,
      hung: false,
      position: [0, 0.2, 11.5],
    })
    expect(saved.portraits[0]!.orientation).toEqual([Math.SQRT1_2, 0, 0, Math.SQRT1_2])
    expect(validateDocument(saved)).toEqual(saved)
    expect(portrait.hung).toBe(true)
  })
  test('lower-level hanging and loose portraits round-trip through collection validation', () => {
    const wall = walls.find(candidate => candidate.id === 'undertone-south')!
    for (const hung of [true, false]) {
      const portrait = {
        ...initialPortraits[0]!,
        hung,
        wallId: wall.id,
        rotation: wall.rotation,
        position: hung ? wallPosition(wall, 0, -1.1) : [18, -3.4, 17] as Vec3,
      }
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      expect(saved.portraits[0]).toMatchObject(portrait)
      expect(validateDocument(saved)).toEqual(saved)
    }
    const portrait = newPortrait(new Blob, 'Lower arrival', 1, 1, {
      position: [18, -2, 18],
      direction: [0, -1, 0],
    })
    expect(portrait.position[1]).toBeCloseTo(-2.8)
  })
  test('every visible tread matches its physical top and adjoins the next one', () => {
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    const material = new MeshBasicMaterial
    try {
      for (const block of stairBlocks) {
        world.createCollider(RAPIER.ColliderDesc.cuboid(block.size[0] / 2, block.size[1] / 2, block.size[2] / 2).setTranslation(...block.position))
      }
      world.step()
      for (const [i, block] of stairBlocks.entries()) {
        const geometry = new BoxGeometry(...block.size)
        try {
          const mesh = new Mesh(geometry, material)
          mesh.position.set(...block.position)
          mesh.updateMatrixWorld(true)
          const origin = new Vector3(block.position[0], 2, block.position[2])
          const direction = new Vector3(0, -1, 0)
          expect(new Raycaster(origin, direction).intersectObject(mesh)[0]!.point.y).toBeCloseTo(block.top)
          expect(world.castRay(new RAPIER.Ray(origin, direction), 10, true)!.timeOfImpact).toBeCloseTo(2 - block.top)
          if (i > 0) {
            const previous = stairBlocks[i - 1]!
            expect(block.position[0] - block.size[0] / 2).toBeCloseTo(previous.position[0] + previous.size[0] / 2)
          }
        } finally {
          geometry.dispose()
        }
      }
    } finally {
      material.dispose()
      world.free()
    }
  })
  for (const [fps, offset] of [[30, -0.7], [60, -0.35], [60, 0], [60, 0.35], [60, 0.7], [120, 0.55], [240, 0]] as const) {
    for (const sprint of [false, true]) {
      for (const ascending of [false, true]) {
        test(`${ascending ? 'ascends' : 'descends'} the full staircase and both portals without jumping (sprint: ${sprint}, physics: ${fps} Hz, offset: ${offset})`, () => {
          const world = new RAPIER.World({
            x: 0,
            y: -9.81,
            z: 0,
          })
          world.timestep = 1 / fps
          const geometries = walls.filter(wall => ['antechamber-east', 'undertone-west', 'undertone-stairs-north', 'undertone-stairs-south'].includes(wall.id)).map(wall => ({
            wall,
            geometry: createArchitectureGeometry(wall),
          }))
          for (const {wall, geometry} of geometries) {
            const rotation = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)
            for (const [vertices, indices] of geometry.collision) {
              world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setTranslation(...wall.center).setRotation(rotation))
            }
          }
          for (const block of stairBlocks) {
            world.createCollider(RAPIER.ColliderDesc.cuboid(block.size[0] / 2, block.size[1] / 2, block.size[2] / 2).setTranslation(...block.position))
          }
          world.createCollider(RAPIER.ColliderDesc.cuboid(4, 0.15, 3.5).setTranslation(0, -0.15, 11.5))
          world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.15, 7).setTranslation(18, lower.floorY - 0.15, 15))
          const slope = -Math.atan2(3.6, 8)
          const roofRotation = (new Quaternion).setFromAxisAngle(new Vector3(0, 0, 1), slope)
          world.createCollider(RAPIER.ColliderDesc.cuboid((Math.hypot(8, 3.6) + 0.2) / 2, 0.09, staircase.width / 2).setTranslation(8, 1.8, staircase.z).setRotation(roofRotation))
          for (const side of [-1, 1]) {
            world.createCollider(RAPIER.ColliderDesc.cuboid(Math.hypot(8, 3.6) / 2, 0.0325, 0.0325).setTranslation(8, -0.8, staircase.z + side * (staircase.width / 2 - 0.22)).setRotation(roofRotation))
          }
          const start: Vec3 = ascending ? [13.4, lower.floorY + 0.04, staircase.z + offset] : [3, 0.04, staircase.z + offset]
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...start))
          const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
          const motor = new EgoMotor(RAPIER, world, body, collider)
          const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), ascending ? Math.PI / 2 : -Math.PI / 2)
          try {
            for (let i = 0; i < 30; i++) {
              motor.step(world.timestep, {}, facing)
              world.step()
            }
            let travelTime = 0
            let stalled = 0
            let longestStall = 0
            for (let i = 0; i < fps * 12; i++) {
              travelTime += world.timestep
              const previousX = body.translation().x
              motor.step(world.timestep, {
                forward: true,
                sprint,
              }, facing)
              world.step()
              stalled = Math.abs(body.translation().x - previousX) < 0.001 ? stalled + world.timestep : 0
              longestStall = Math.max(longestStall, stalled)
              if (ascending ? body.translation().x < 3 : body.translation().x > 13.4) {
                break
              }
            }
            // A riser may consume one physics tick, not a visible stop-and-reaccelerate cycle.
            expect(longestStall).toBeLessThan(0.035)
            expect(travelTime).toBeLessThan(sprint ? 1.8 : 4.7)
            expect(ascending ? body.translation().x < 3 : body.translation().x > 13.4).toBe(true)
            for (let i = 0; i < 60; i++) {
              motor.step(world.timestep, {}, facing)
              world.step()
            }
            expect(body.translation().y).toBeCloseTo((ascending ? 0 : lower.floorY) + 0.02, 2)
            expect(motor.grounded).toBe(true)
          } finally {
            motor.dispose()
            world.free()
            for (const {geometry} of geometries) {
              geometry.dispose()
            }
          }
        })
      }
    }
  }
})
