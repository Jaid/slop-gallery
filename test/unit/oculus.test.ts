import type {ReactNode} from 'react'

import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {EgoMotor} from 'ego-player/motor'
import {Children, isValidElement} from 'react'
import {BoxGeometry, Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3} from 'three/webgpu'

import renderOculusRoom from '../../src/components/Scene/OculusRoom.tsx'
import {createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {initialPortraits} from '../../src/lib/gallery/collection.ts'
import {floorThickness, roomFloorPlan} from '../../src/lib/gallery/floors.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {lobby} from '../../src/lib/gallery/lobby.ts'
import {lowerGallery, oculusCeiling, oculusPlatform} from '../../src/lib/gallery/lowerGallery.ts'
import {StairFlight} from '../../src/lib/gallery/stairs/StairFlight.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import {floorHeight, insideGallery, roomAt, rooms, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
const {floorY, oculus, tunnel, moonfall} = lowerGallery
const upper = rooms.find(room => room.id === 'lobby')!
describe('oculus and connecting tunnel', () => {
  test('both side walls expand three meters while the centered glass and entrance stay fixed', () => {
    expect(walls.find(value => value.id === 'oculus-west')!.center[0]).toBe(-9)
    expect(walls.find(value => value.id === 'oculus-east')!.center[0]).toBe(9)
    expect(insideGallery([-8.9, -6.4, -20])).toBe(true)
    expect(insideGallery([8.9, -6.4, -20])).toBe(true)
    expect(insideGallery([9.01, -6.4, -20])).toBe(false)
    expect(lobby.opening.center).toEqual([0, -20])
    expect(tunnel.x).toBe(0)
    expect(oculusCeiling.reduce((sum, slab) => sum + slab.size[0] * slab.size[1], 0)).toBe(18 * 17 - 8 * 8)
  })
  test('art follows either widened side wall exactly once without moving loose art', () => {
    for (const side of [-1, 1]) {
      const portrait = {
        ...initialPortraits[0]!,
        wallId: side === -1 ? 'oculus-west' : 'oculus-east',
        position: [side * 5.78, -5.5, -20] as [number, number, number],
        rotation: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      }
      const saved = validateDocument({
        ...createDocument(),
        portraits: [portrait],
      })
      expect(saved.portraits[0]!.position[0]).toBeCloseTo(side * 8.78)
      expect(saved.portraits[0]!.position.slice(1)).toEqual([-5.5, -20])
      expect(validateDocument(saved)).toEqual(saved)
      const loose = validateDocument({
        ...createDocument(),
        portraits: [
          {
            ...portrait,
            hung: false,
          },
        ],
      })
      expect(loose.portraits[0]!.position).toEqual(portrait.position)
    }
  })
  test('lower walls meet the ceiling underside without coplanar faces in the upper floor', () => {
    const ceilingBottom = oculus.ceiling.topY - oculus.ceiling.thickness
    expect(oculus.ceiling.topY).toBe(-floorThickness)
    const material = new MeshBasicMaterial
    try {
      for (const side of ['north', 'east', 'south', 'west']) {
        const wall = walls.find(value => value.id === `oculus-${side}`)!
        const geometry = createArchitectureGeometry(wall)
        try {
          const mesh = new Mesh(geometry.surface, material)
          mesh.position.set(...wall.center)
          mesh.rotation.y = wall.rotation
          mesh.updateMatrixWorld(true)
          expect(wall.center[1] + geometry.surface.boundingBox!.max.y).toBeCloseTo(ceilingBottom, 5)
          for (const part of [geometry.surface, ...geometry.trim]) {
            expect(wall.center[1] + part.boundingBox!.max.y).toBeLessThan(-floorThickness)
          }
          const origin = mesh.localToWorld(new Vector3(0, 0, wallFace / 2))
          origin.y = 1
          const ray = new Raycaster(origin, new Vector3(0, -1, 0), 0, 1 + floorThickness)
          expect(ray.intersectObject(mesh)).toHaveLength(0)
          ray.far = 2
          expect(ray.intersectObject(mesh)[0]!.point.y).toBeCloseTo(ceilingBottom, 5)
        } finally {
          geometry.dispose()
        }
      }
    } finally {
      material.dispose()
    }
  })
  test('the plain cuboid fills the extended north end with a matching walkable top', () => {
    const {position, size} = oculusPlatform
    expect(size).toEqual([18, 3, 5])
    expect(position).toEqual([0, -6.5, -28.5])
    expect(position[1] - size[1] / 2).toBe(floorY)
    expect(position[2] - size[2] / 2).toBe(-31)
    expect(position[2] + size[2] / 2).toBe(-26)
    expect(floorHeight([0, -3.4, -28.5])).toBe(-5)
    expect(floorHeight([0, 1.6, -28.5])).toBe(0)
    expect(floorHeight([0, -6.4, -25.9])).toBe(floorY)
    const geometry = new BoxGeometry(...size)
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.updateMatrixWorld(true)
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    try {
      world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setTranslation(...position))
      world.step()
      const origin = new Vector3(0, -3, -28.5)
      const direction = new Vector3(0, -1, 0)
      expect(new Raycaster(origin, direction).intersectObject(mesh)[0]!.point.y).toBe(-5)
      expect(world.castRay(new RAPIER.Ray(origin, direction), 4, true)!.timeOfImpact).toBe(2)
    } finally {
      geometry.dispose()
      material.dispose()
      world.free()
    }
  })
  test('the north wall moves five meters without shifting the glass or southern portal', () => {
    expect(walls.find(wall => wall.id === 'oculus-north')!.center[2]).toBe(-31)
    expect(walls.find(wall => wall.id === 'oculus-south')!.center[2]).toBe(-14)
    expect(oculus.center).toEqual([0, -22.5])
    expect(oculus.size).toEqual([18, 17])
    expect(lobby.opening.center).toEqual([0, -20])
    expect(lobby.opening.size).toEqual([8, 8])
    expect(insideGallery([0, -6.4, -30.8])).toBe(true)
    expect(insideGallery([0, -6.4, -31.01])).toBe(false)
    expect(roomAt([0, -6.4, -20])).toBe('oculus')
    expect(roomAt([0, 1.6, -20])).toBe('lobby')
    for (const z of [-13.9, -8, 0, 4.4]) {
      expect(insideGallery([0, -6.4, z])).toBe(true)
      expect(floorHeight([0, -6.4, z])).toBe(floorY)
      expect(roomAt([0, -6.4, z])).toBe('oculus')
    }
    expect(insideGallery([tunnel.width / 2 + 0.01, -6.4, 0])).toBe(false)
  })
  test('the ceiling opening stays aligned with the transparent floor and contains no fixtures or lights', () => {
    const material = new MeshBasicMaterial
    const meshes = [
      ...roomFloorPlan(upper).slabs.map(({center: [x, z], size: [width, depth]}) => {
        const mesh = new Mesh(new BoxGeometry(width, floorThickness, depth), material)
        mesh.position.set(x + upper.center[0], -floorThickness / 2, z + upper.center[1])
        return mesh
      }),
      ...oculusCeiling.map(({center: [x, z], size: [width, depth]}) => {
        const mesh = new Mesh(new BoxGeometry(width, oculus.ceiling.thickness, depth), material)
        mesh.position.set(x + oculus.center[0], oculus.ceiling.topY - oculus.ceiling.thickness / 2, z + oculus.center[1])
        return mesh
      }),
    ]
    try {
      for (const mesh of meshes) {
        mesh.updateMatrixWorld(true)
      }
      for (const x of [-5, -3.9, 0, 3.9, 5]) {
        for (const z of [-30, -24.1, -23.9, -20, -16.1, -15.9, -14.5]) {
          const glass = Math.abs(x) < 4 && z > -24 && z < -16
          expect(new Raycaster(new Vector3(x, 4.9, z), new Vector3(0, -1, 0), 0, 13).intersectObjects(meshes).length === 0).toBe(glass)
        }
      }
      const visit = (node: ReactNode) => {
        Children.forEach(node, child => {
          if (!isValidElement<{children?: ReactNode}>(child)) {
            return
          }
          if (typeof child.type === 'string') {
            expect(child.type).not.toMatch(/emissive|light/i)
          }
          visit(child.props.children)
        })
      }
      visit(renderOculusRoom({
        material,
      }))
    } finally {
      for (const mesh of meshes) {
        mesh.geometry.dispose()
      }
      material.dispose()
    }
  })
  test('art on either previous north-wall position migrates once', () => {
    for (const z of [-25.78, -27.78]) {
      const saved = validateDocument({
        ...createDocument(),
        portraits: [
          {
            ...initialPortraits[0]!,
            wallId: 'oculus-north',
            position: [-4, -5.5, z],
          },
        ],
      })
      expect(saved.portraits[0]!.position).toEqual([-4, -5.5, -30.78])
      expect(validateDocument(saved)).toEqual(saved)
    }
  })
  for (const fps of [30, 60, 120]) {
    for (const offset of [-1.35, 0, 1.35]) {
      for (const sprint of [false, true]) {
        for (const returning of [false, true]) {
          test(`tunnel traverses both portals at ${fps} Hz, offset ${offset}, sprint ${sprint}, returning ${returning}`, () => {
            const world = new RAPIER.World({
              x: 0,
              y: -9.81,
              z: 0,
            })
            world.timestep = 1 / fps
            const geometries = walls.filter(wall => ['moonfall-north', 'oculus-south'].includes(wall.id) || wall.id.startsWith('oculus-tunnel-')).map(wall => ({
              wall,
              geometry: createArchitectureGeometry(wall),
            }))
            for (const {wall, geometry} of geometries) {
              for (const [vertices, indices] of geometry.collision) {
                world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setTranslation(...wall.center).setRotation((new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), wall.rotation)))
              }
            }
            for (const room of [moonfall, oculus]) {
              world.createCollider(RAPIER.ColliderDesc.cuboid(room.size[0] / 2, 0.12, room.size[1] / 2).setTranslation(room.center[0], floorY - 0.12, room.center[1]))
            }
            world.createCollider(RAPIER.ColliderDesc.cuboid(tunnel.width / 2, 0.12, (tunnel.southZ - tunnel.northZ) / 2).setTranslation(tunnel.x, floorY - 0.12, (tunnel.southZ + tunnel.northZ) / 2))
            world.createCollider(RAPIER.ColliderDesc.cuboid(tunnel.width / 2, 0.09, (tunnel.southZ - tunnel.northZ) / 2).setTranslation(tunnel.x, floorY + tunnel.height + 0.09, (tunnel.southZ + tunnel.northZ) / 2))
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(offset, floorY + 0.04, returning ? -15.5 : 6))
            const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.3).setTranslation(0, 0.8, 0), body)
            const motor = new EgoMotor(RAPIER, world, body, collider)
            const facing = (new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), returning ? Math.PI : 0)
            try {
              for (let i = 0; i < fps * 10; i++) {
                motor.step(world.timestep, {
                  forward: true,
                  sprint,
                }, facing)
                world.step()
                if (returning ? body.translation().z > 6 : body.translation().z < -15.5) {
                  break
                }
              }
              expect(returning ? body.translation().z > 6 : body.translation().z < -15.5).toBe(true)
              expect(body.translation().y).toBeCloseTo(floorY + 0.02, 2)
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
test('stair flights reject degenerate dimensions rather than emitting broken geometry', () => {
  expect(() => new StairFlight('invalid', [0, 0, 0], [0, -4, 0], 2.6, 20)).toThrow(RangeError)
  expect(() => new StairFlight('invalid', [0, 0, 0], [8, -4, 1], 2.6, 20)).toThrow(RangeError)
  expect(() => new StairFlight('invalid', [0, 0, 0], [8, -4, 0], 2.6, 0)).toThrow(RangeError)
  expect(() => new StairFlight('invalid', [0, 0, 0], [8, -4, 0], 2.6, 20, 9)).toThrow(RangeError)
})
