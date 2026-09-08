import {describe, expect, test} from 'bun:test'
import RAPIER from '@dimforge/rapier3d-compat'
import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'
import {computeMeshVolume} from 'three-bvh-csg'

import {createArchitectureGeometry, wallFace, wallTop} from '../../src/lib/gallery/architecture.ts'
import {findPlacement, insideOpening, openingTop, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()

describe('boolean architecture', () => {
  for (const wall of walls.filter(wall => wall.holes?.length)) {
    test(`${wall.id}: curved openings match the visible solid and physical collision on both faces`, () => {
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial({side: DoubleSide})
      const meshes = [geometry.surface, ...geometry.trim].map(geometry => new Mesh(geometry, material))
      const world = new RAPIER.World({x: 0, y: 0, z: 0})
      try {
        for (const [vertices, indices] of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
        }
        world.step()
        for (const hole of wall.holes!) {
          // Sample the jambs, the formerly rectangular upper corners and the crown.
          for (const offset of [-1.45, -1.2, -0.6, 0, 0.6, 1.2, 1.45]) {
            const u = hole.u + offset
            for (const y of [0.2, 1.62, 2.5, 3.2, 3.55, 3.75, 3.9, 4.1]) {
              const solid = !insideOpening(hole, u, y)
              for (const side of [-1, 1]) {
                const origin = new Vector3(u, y, side)
                const direction = new Vector3(0, 0, -side)
                const ray = new Raycaster(origin, direction, 0, 2)
                expect(ray.intersectObject(meshes[0]!).length > 0).toBe(solid)
                expect(ray.intersectObjects(meshes).length > 0).toBe(solid)
                expect(!!world.castRay(new RAPIER.Ray(origin, direction), 2, true)).toBe(solid)
              }
            }
          }
        }
        const openingArea = wall.holes!.reduce((sum, hole) => sum + (hole.profile === 'arch' ? hole.width * (hole.height - hole.width / 2) + Math.PI * (hole.width / 2) ** 2 / 2 : hole.width * hole.height), 0)
        expect(Number(computeMeshVolume(geometry.surface))).toBeCloseTo((wall.width * wallTop - openingArea) * wallFace, 3)
        expect(geometry.surface.boundingBox!.min.z).toBeCloseTo(0)
        expect(geometry.surface.boundingBox!.max.z).toBeCloseTo(wallFace)
        for (const mesh of meshes) {
          for (const name of ['position', 'normal', 'uv']) {
            expect(Array.from(mesh.geometry.getAttribute(name).array).every(Number.isFinite)).toBe(true)
          }
        }
      } finally {
        world.free()
        material.dispose()
        geometry.dispose()
      }
    })
  }
  test('placement rays hit the solid arch shoulders, not the opening beneath them', () => {
    const wall = walls.find(wall => wall.id === 'daydream-east')!
    const hole = wall.holes![0]!
    expect(openingTop(hole, hole.u)).toBeCloseTo(3.8)
    expect(openingTop(hole, hole.u + 1.2)).toBeLessThan(3.2)
    expect(findPlacement([5, 3.5, 4.2], [1, 0, 0], 0, 0, [])?.wallId).toBe(wall.id)
    expect(findPlacement([5, 3.5, 3], [1, 0, 0], 0, 0, [])).toMatchObject({wallId: 'afterhours-east', inReach: false, valid: false})
  })
  test('supports multiple independent openings without leaving a bottom sill', () => {
    const wall = {...walls[0]!, holes: [{u: -3, width: 2, height: 3.5, profile: 'arch' as const}, {u: 3, width: 2.5, height: 3.6, profile: 'rectangle' as const}]}
    const geometry = createArchitectureGeometry(wall)
    const material = new MeshBasicMaterial({side: DoubleSide})
    try {
      const meshes = [geometry.surface, ...geometry.trim].map(geometry => new Mesh(geometry, material))
      for (const hole of wall.holes) {
        for (const y of [0.001, 1.62, 3.4]) {
          expect(new Raycaster(new Vector3(hole.u, y, 1), new Vector3(0, 0, -1), 0, 2).intersectObjects(meshes)).toHaveLength(0)
        }
      }
      expect(new Raycaster(new Vector3(0, 1.62, 1), new Vector3(0, 0, -1), 0, 2).intersectObjects(meshes).length).toBeGreaterThan(0)
    } finally {
      material.dispose()
      geometry.dispose()
    }
  })
})
