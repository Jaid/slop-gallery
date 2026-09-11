import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import lowerGallery from '../../src/lib/gallery/lowerGallery.ts'
import balcony, {balconyFloorHeight} from '../../src/lib/gallery/oculusBalcony.ts'
import OculusBalconyGeometry from '../../src/lib/gallery/OculusBalconyGeometry.ts'
import OculusGroundGeometry from '../../src/lib/gallery/OculusGroundGeometry.ts'
import tower from '../../src/lib/gallery/oculusTower.ts'
import walls, {floorHeight} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
describe('separate semicircular Oculus balcony', () => {
  test('the larger tower stays separated from a wall-mounted balcony above the doorway', () => {
    expect(tower.radius).toBe(2.2)
    expect(balcony.topY).toBe(tower.floorY + tower.height)
    expect(balcony.z).toBe(walls.find(wall => wall.id === 'oculus-south')!.center[2])
    expect(balcony.z - balcony.depth - (tower.z + tower.radius)).toBeCloseTo(2.6)
    expect(balcony.topY - balcony.thickness).toBeCloseTo(lowerGallery.floorY + lowerGallery.tunnel.height + wallOpeningTrim)
    const material = new MeshBasicMaterial
    const geometry = new OculusBalconyGeometry
    const ground = new OculusGroundGeometry
    const meshes = [new Mesh(geometry, material), new Mesh(ground, material)]
    try {
      for (const z of [-17.5, -17, -16.5, -16, -15.5]) {
        expect(new Raycaster(new Vector3(0, -2, z), new Vector3(0, -1, 0), 0, 5).intersectObjects(meshes)).toHaveLength(0)
        expect(floorHeight([0, -2, z])).toBe(lowerGallery.floorY)
      }
      for (const x of [-2.1, 2.1]) {
        expect(new Raycaster(new Vector3(x, -2, tower.z), new Vector3(0, -1, 0)).intersectObjects(meshes)[0].point.y).toBeCloseTo(balcony.topY)
      }
    } finally {
      material.dispose()
      geometry.dispose()
      ground.dispose()
    }
  })
  test('the enlarged slab meets the doorway frame without changing its walking height or footprint', () => {
    const wall = walls.find(value => value.id === 'oculus-south')!
    const frame = createArchitectureGeometry(wall)
    const geometry = new OculusBalconyGeometry
    const material = new MeshBasicMaterial
    try {
      const frameTop = wall.center[1] + frame.trim[0].boundingBox!.max.y
      expect(geometry.boundingBox!.min.y).toBeCloseTo(frameTop, 6)
      expect(geometry.boundingBox!.max.y).toBeCloseTo(tower.floorY + tower.height, 6)
      expect(balcony.thickness).toBeCloseTo(0.73, 6)
      const mesh = new Mesh(geometry, material)
      for (const x of [-lowerGallery.tunnel.width / 2, 0, lowerGallery.tunnel.width / 2]) {
        const hits = new Raycaster(new Vector3(x, lowerGallery.floorY + 1.7, balcony.z - 0.25), new Vector3(0, 1, 0)).intersectObject(mesh)
        expect(hits[0].point.y).toBeCloseTo(frameTop, 6)
      }
    } finally {
      frame.dispose()
      geometry.dispose()
      material.dispose()
    }
  })
  test('the curved slab and collider agree, support weight and leave the entrance clear underneath', () => {
    const geometry = new OculusBalconyGeometry
    const material = new MeshBasicMaterial
    const mesh = new Mesh(geometry, material)
    const world = new RAPIER.World({
      x: 0,
      y: -9.81,
      z: 0,
    })
    try {
      expect(geometry.boundingBox!.min.y).toBeCloseTo(balcony.topY - balcony.thickness)
      expect(geometry.boundingBox!.max.y).toBeCloseTo(balcony.topY)
      world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry)))
      world.step()
      for (const [x, z, inside] of [[0, -14.6, true], [1.2, -14.5, true], [-1.2, -14.5, true], [1.7, -15, false], [0, -15.3, false], [0, -13.9, false]] as const) {
        const origin = new Vector3(x, -2, z)
        const direction = new Vector3(0, -1, 0)
        const hits = new Raycaster(origin, direction).intersectObject(mesh)
        const collision = world.castRay(new RAPIER.Ray(origin, direction), 5, true)
        expect(hits.length > 0).toBe(inside)
        expect(collision !== null).toBe(inside)
        expect(balconyFloorHeight(x, z)).toBe(inside ? balcony.topY : undefined)
        if (inside) {
          expect(hits[0].point.y).toBeCloseTo(balcony.topY)
          expect(collision!.timeOfImpact).toBeCloseTo(origin.y - balcony.topY)
          expect(floorHeight([x, balcony.topY + 1.6, z])).toBe(balcony.topY)
          expect(floorHeight([x, lowerGallery.floorY + 1.6, z])).toBe(lowerGallery.floorY)
        }
      }
      expect(world.castRay(new RAPIER.Ray(new Vector3(0, lowerGallery.floorY + 1.7, -13), new Vector3(0, 0, -1)), 3, true)).toBeNull()
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, balcony.topY + 1, balcony.z - 0.5))
      world.createCollider(RAPIER.ColliderDesc.ball(0.2), body)
      for (let i = 0; i < 120; i++) {
        world.step()
      }
      expect(body.translation().y).toBeCloseTo(balcony.topY + 0.2, 2)
    } finally {
      world.free()
      geometry.dispose()
      material.dispose()
    }
  })
})
