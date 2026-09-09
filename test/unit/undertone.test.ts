import type {Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {BoxGeometry, Euler, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import {newPortrait} from '../../src/lib/gallery/actions.ts'
import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {stairBlocks, staircase, stairFlights, stairFloorHeight, stairRails, stairRoofs, stairTurn} from '../../src/lib/gallery/staircase.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {findPlacement, floorHeight, insideGallery, placementIssue, roomAt, rooms, roomVisit, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const lower = rooms.find(candidate => candidate.id === 'undertone')!
const upper = rooms.find(candidate => candidate.id === 'antechamber')!
describe('lower gallery', () => {
  test('stacked rooms, both stair flights and the U-turn landing resolve their own elevation', () => {
    expect(lower.center).toEqual(upper.center)
    expect(roomVisit(lower).position[1]).toBeCloseTo(-6.3)
    for (const block of stairBlocks) {
      const position: Vec3 = [block.position[0], block.top + 1.6, block.position[2]]
      expect(stairFloorHeight(position[0], position[2])).toBeCloseTo(block.top)
      expect(floorHeight(position)).toBeCloseTo(block.top)
      expect(insideGallery(position)).toBe(true)
      expect(roomAt(position)).toBe('undertone')
    }
    expect(roomAt([0, 1.6, 11.5])).toBe('antechamber')
    expect(roomAt([0, -6.4, 11.5])).toBe('undertone')
    expect(floorHeight([0, 1.6, 11.5])).toBe(0)
    expect(floorHeight([0, -6.4, 11.5])).toBe(-8)
    expect(floorHeight([5, -6.4, 11.5])).toBe(-8)
    expect(insideGallery([0, -8.95, 11.5])).toBe(true)
    expect(insideGallery([0, -9.01, 11.5])).toBe(false)
    expect(insideGallery([8, -1, 14])).toBe(false)
    expect(insideGallery([Number.NaN, -2, 15])).toBe(false)
    expect(stairFloorHeight(stairTurn.position[0], stairTurn.position[2])).toBe(-4)
    expect(stairFloorHeight(8, 13.3)).toBeUndefined()
  })
  test('wall rays and frame clearance respect lower-level elevations and relocated portals', () => {
    const wall = walls.find(candidate => candidate.id === 'undertone-south')!
    const position = wallPosition(wall, 2, lower.floorY + 2.5)
    expect(position[1]).toBeCloseTo(-5.5)
    expect(placementIssue(wall, position, 2, 2, [])).toBe('')
    expect(placementIssue(wall, wallPosition(wall, 2, lower.floorY + 1), 2, 2, [])).toContain('label')
    expect(findPlacement([-2, -5.5, 14], [0, 0, 1], 2, 2, [])).toMatchObject({
      wallId: wall.id,
      valid: true,
    })
    expect(findPlacement([4, -6.4, staircase.returnZ], [1, 0, 0], 1, 1, [])).toBeNull()
    expect(findPlacement([4, -6.4, 11.5], [1, 0, 0], 1, 1, [])?.wallId).toBe('undertone-east')
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
  test('hanging and loose portraits survive relocation once without changing their metadata', () => {
    const wall = walls.find(candidate => candidate.id === 'undertone-south')!
    for (const hung of [true, false]) {
      const portrait = {
        ...initialPortraits[0]!,
        hung,
        wallId: wall.id,
        rotation: wall.rotation,
        position: hung ? wallPosition(wall, 2, -5.5) : [0, -7.8, 15] as Vec3,
      }
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      expect(saved.portraits[0]).toMatchObject(portrait)
      expect(validateDocument(saved)).toEqual(saved)
      const old = {
        ...portrait,
        position: [portrait.position[0] + 18, portrait.position[1] + 4.4, portrait.position[2] + 3.5],
      }
      const migrated = validateDocument({
        ...createDocument(),
        portraits: [old],
      }).portraits[0]!
      expect(migrated).toMatchObject({
        ...portrait,
        position: migrated.position,
      })
      for (const [axis, value] of portrait.position.entries()) {
        expect(migrated.position[axis]!).toBeCloseTo(value)
      }
    }
    const portrait = newPortrait(new Blob, 'Lower arrival', 1, 1, {
      position: [0, -6.4, 15],
      direction: [0, -1, 0],
    })
    expect(portrait.position[1]).toBeCloseTo(-7.2)
  })
  test('legacy paintings displaced by the east stair portal or north tunnel are laid safely inside', () => {
    for (const portrait of [
      {
        ...initialPortraits[0]!,
        wallId: 'undertone-east',
        rotation: -Math.PI / 2,
        position: [23.78, -1.1, 18.6],
      },
      {
        ...initialPortraits[0]!,
        wallId: 'undertone-north',
        rotation: 0,
        position: [18, -1.1, 8.22],
      },
    ]) {
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      expect(saved.portraits[0]).toMatchObject({
        hung: false,
        position: [0, -7.8, 15],
      })
      expect(validateDocument(saved)).toEqual(saved)
    }
  })
  test('every tread matches the physical floor, and sidewalls close every tread edge', () => {
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
      for (const block of stairBlocks) {
        const geometry = new BoxGeometry(...block.size)
        try {
          const mesh = new Mesh(geometry, material)
          mesh.position.set(...block.position)
          mesh.updateMatrixWorld(true)
          const origin = new Vector3(block.position[0], 2, block.position[2])
          const direction = new Vector3(0, -1, 0)
          expect(new Raycaster(origin, direction).intersectObject(mesh)[0]!.point.y).toBeCloseTo(block.top)
          expect(world.castRay(new RAPIER.Ray(origin, direction), 12, true)!.timeOfImpact).toBeCloseTo(2 - block.top)
        } finally {
          geometry.dispose()
        }
      }
      for (const flight of stairFlights) {
        for (const side of [-1, 1]) {
          const wall = flight.wall(side)
          const geometry = createArchitectureGeometry(wall)
          try {
            const mesh = new Mesh(geometry.surface, material)
            mesh.position.set(...wall.center)
            mesh.rotation.y = wall.rotation
            mesh.updateMatrixWorld(true)
            for (const block of flight.blocks) {
              for (const edge of [-0.499, 0, 0.499]) {
                const x = block.position[0] + block.size[0] * edge
                const ray = new Raycaster(new Vector3(x, block.top + 0.001, block.position[2]), new Vector3(0, 0, side), 0, 2)
                expect(ray.intersectObject(mesh).length).toBeGreaterThan(0)
              }
            }
          } finally {
            geometry.dispose()
          }
        }
      }
    } finally {
      material.dispose()
      world.free()
    }
  })
  for (const fps of [30, 60, 120, 240]) {
    for (const offset of [-0.65, 0, 0.65]) {
      for (const sprint of [false, true]) {
        for (const ascending of [false, true]) {
          test(`${ascending ? 'ascends' : 'descends'} the U-turn stairs at ${fps} Hz, offset ${offset}, sprint ${sprint}`, () => {
            const world = new RAPIER.World({
              x: 0,
              y: -9.81,
              z: 0,
            })
            world.timestep = 1 / fps
            const geometries = walls.filter(wall => ['antechamber-east', 'undertone-east'].includes(wall.id) || wall.id.startsWith('undertone-stairs-')).map(wall => ({
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
            for (const beam of [...stairRoofs, ...stairRails]) {
              world.createCollider(RAPIER.ColliderDesc.cuboid(beam.size[0] / 2, beam.size[1] / 2, beam.size[2] / 2).setTranslation(...beam.position).setRotation((new Quaternion).setFromEuler(new Euler(...beam.rotation))))
            }
            world.createCollider(RAPIER.ColliderDesc.cuboid(4, 0.15, 3.5).setTranslation(0, -0.15, 11.5))
            world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.15, 7).setTranslation(0, lower.floorY - 0.15, 11.5))
            world.createCollider(RAPIER.ColliderDesc.cuboid(6, 0.15, 7).setTranslation(0, lower.floorY + 5.9, 11.5))
            const path = [[3, staircase.z + offset], [stairTurn.position[0], staircase.z + offset], [stairTurn.position[0], staircase.returnZ + offset], [4.4, staircase.returnZ + offset]]
            if (ascending) {
              path.reverse()
            }
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0]![0]!, (ascending ? lower.floorY : 0) + 0.04, path[0]![1]!))
            const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
            const motor = new EgoMotor(RAPIER, world, body, collider)
            const facing = new Quaternion
            try {
              for (let i = 0; i < 30; i++) {
                motor.step(world.timestep, {}, facing)
                world.step()
              }
              let target = 1
              for (let i = 0; i < fps * 16 && target < path.length; i++) {
                const position = body.translation()
                const dx = path[target]![0]! - position.x
                const dz = path[target]![1]! - position.z
                if (Math.hypot(dx, dz) < Math.max(0.14, (sprint ? 8 : 3) / fps)) {
                  target++
                  continue
                }
                facing.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(-dx, -dz))
                motor.step(world.timestep, {
                  forward: true,
                  sprint,
                }, facing)
                world.step()
              }
              expect(target).toBe(path.length)
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
  }
})
