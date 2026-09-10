import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {computeMeshVolume} from 'three-bvh-csg'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {architectureGeometry, colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {lowerGallery, oculusPlatform, oculusRamps} from '../../src/lib/gallery/lowerGallery.ts'
import {walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
describe('floor-following wall baseboards', () => {
  for (const side of ['west', 'east'] as const) {
    test(`${side}: constant-height trim follows the floor, ramp and raised base without buried horizontal stubs`, () => {
      const wall = walls.find(value => value.id === `oculus-${side}`)!
      const ramp = oculusRamps.find(value => value.side === side)!
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial
      const meshes = geometry.trim.map(part => new Mesh(part, material))
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        for (const part of geometry.trim) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(part)))
        }
        world.step()
        for (const z of [-30.7, -26.01, -26, -25.99, -24, -20, -18.3, -17.01, -17, -16.99, -14.2]) {
          const u = (z - wall.center[2]) * (side === 'east' ? 1 : -1)
          const floor = Math.max(0, Math.min(ramp.rise, (ramp.startZ - z) / ramp.run * ramp.rise))
          for (const offset of [-0.02, 0.02, 0.19, 0.379, 0.381, 0.41, 0.439, 0.46]) {
            const origin = new Vector3(u, floor + offset, 1)
            const direction = new Vector3(0, 0, -1)
            const hits = new Raycaster(origin, direction, 0, 1).intersectObjects(meshes)
            const collision = world.castRay(new RAPIER.Ray(origin, direction), 1, true)
            const visible = offset > 0 && offset < 0.44
            expect(hits.length > 0).toBe(visible)
            expect(collision !== null).toBe(visible)
            if (visible) {
              const front = offset < 0.38 ? 0.2 : 0.25
              expect(hits[0].point.z).toBeCloseTo(front, 5)
              expect(collision!.timeOfImpact).toBeCloseTo(1 - front, 5)
            }
          }
          const topRay = new Raycaster(new Vector3(u, floor + 0.6, 0.23), new Vector3(0, -1, 0), 0, 1)
          expect(topRay.intersectObjects(meshes)[0].point.y).toBeCloseTo(floor + 0.44, 5)
        }
        const volume = geometry.trim.reduce((sum, part) => sum + Number(computeMeshVolume(part)), 0)
        expect(volume).toBeCloseTo(wall.width * (0.38 * (0.2 - wallFace) + 0.06 * (0.25 - wallFace)), 4)
      } finally {
        world.free()
        geometry.dispose()
        material.dispose()
      }
    })
  }
  test('the north trim follows the raised floor and surrounds the elevated Lodge portal', () => {
    const north = walls.find(value => value.id === 'oculus-north')!
    const height = oculusPlatform.position[1] + oculusPlatform.size[1] / 2 - lowerGallery.floorY
    expect(north.baseboardProfile).toEqual([[-north.width / 2, height], [north.width / 2, height]])
    const geometry = createArchitectureGeometry(north)
    try {
      expect(north.holes![0].bottom).toBe(height)
      expect(geometry.trim[0].boundingBox!.min.y).toBeCloseTo(height - 0.17)
      expect(geometry.trim[0].boundingBox!.max.y).toBeCloseTo(north.holes![0].height + 0.17)
      const material = new MeshBasicMaterial
      const mesh = new Mesh(geometry.trim[0], material)
      const hit = new Raycaster(new Vector3(-4, height + 1, 0.23), new Vector3(0, -1, 0)).intersectObject(mesh)[0]
      expect(hit.point.y).toBeCloseTo(height + 0.44)
      material.dispose()
      expect(geometry.surface.boundingBox!.min.y).toBeCloseTo(0, 6)
      expect(geometry.surface.boundingBox!.max.y).toBeCloseTo(north.height + 0.3)
      expect(walls.filter(wall => wall.baseboardProfile).map(wall => wall.id).toSorted()).toEqual(['oculus-east', 'oculus-north', 'oculus-west'])
    } finally {
      geometry.dispose()
    }
  })
  test('geometry caching distinguishes mirrored and flat floor profiles', () => {
    const west = walls.find(value => value.id === 'oculus-west')!
    const east = walls.find(value => value.id === 'oculus-east')!
    const left = architectureGeometry(west)
    const right = architectureGeometry(east)
    expect(left).not.toBe(right)
    expect(architectureGeometry({...west})).toBe(left)
    expect(architectureGeometry({
      ...west,
      baseboardProfile: undefined,
    })).not.toBe(left)
  })
})
