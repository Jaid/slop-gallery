import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {computeMeshVolume} from 'three-bvh-csg'
import {BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry, createArchitectureGeometry, wallFace} from '../../src/lib/gallery/architecture.ts'
import {findPlacement, insideOpening, openingTop, walls} from '../../src/lib/gallery/walls.ts'

await RAPIER.init()
describe('physical mesh topology', () => {
  for (const indexed of [false, true]) {
    test(`welds render seams and removes degenerate faces without changing the source, indexed ${indexed}`, () => {
      const geometry = new BufferGeometry
      const positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
      const uv = Array.from({length: 18}, (_, i) => i / 18)
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
      geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
      if (indexed) {
        geometry.setIndex(Array.from({length: 9}, (_, i) => i))
      }
      const originalUv = [...geometry.getAttribute('uv').array]
      const originalIndex = geometry.index
      try {
        const [vertices, indices] = colliderGeometry(geometry)
        expect(vertices).toHaveLength(12)
        expect(indices).toHaveLength(6)
        expect(new Set(indices).size).toBe(4)
        expect([...geometry.getAttribute('position').array]).toEqual(positions)
        expect([...geometry.getAttribute('uv').array]).toEqual(originalUv)
        expect(geometry.index).toBe(originalIndex)
        vertices[0] = 99
        expect(geometry.getAttribute('position').getX(0)).toBe(0)
      } finally {
        geometry.dispose()
      }
    })
  }
})
describe('boolean architecture', () => {
  for (const wall of walls.filter(wall => wall.holes?.length)) {
    test(`${wall.id}: curved openings match the visible solid and physical collision on both faces`, () => {
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial({side: DoubleSide})
      const meshes = [geometry.surface, ...geometry.trim].map(geometry => new Mesh(geometry, material))
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        for (const [vertices, indices] of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
        }
        world.step()
        for (const hole of wall.holes!) {
          // Sample the jambs, upper corners and crown, staying off exact cut edges.
          for (const offset of [-1.45, -1.19, -0.6, 0, 0.6, 1.19, 1.45]) {
            const u = hole.u + offset
            for (const y of [0.2, 1.62, 2.5, 3.2, 3.55, 3.75, 3.9, 4.1].filter(value => value < wall.height + 0.3 - 0.001)) {
              const opening = wall.holes!.find(candidate => insideOpening(candidate, u, y))
              const solid = Math.abs(u) <= wall.width / 2 && !opening
              for (const side of [-1, 1]) {
                const origin = new Vector3(u, y, side)
                const direction = new Vector3(0, 0, -side)
                const ray = new Raycaster(origin, direction, 0, 2)
                expect(ray.intersectObject(meshes[0]).length > 0).toBe(solid)
                expect(ray.intersectObjects(meshes).length > 0).toBe(solid)
                expect(!!world.castRay(new RAPIER.Ray(origin, direction), 2, true)).toBe(solid || !!opening?.glassThickness)
              }
            }
          }
        }
        const openingArea = wall.holes!.reduce((sum, hole) => sum + (hole.profile === 'arch' ? hole.width * (hole.height - hole.width / 2 - (hole.bottom ?? 0)) + Math.PI * (hole.width / 2) ** 2 / 2 : hole.width * (hole.height - (hole.bottom ?? 0))), 0)
        expect(Number(computeMeshVolume(geometry.surface))).toBeCloseTo((wall.width * (wall.height + 0.3) - openingArea) * wallFace, 3)
        expect(geometry.surface.boundingBox!.min.z).toBeCloseTo(0)
        expect(geometry.surface.boundingBox!.max.z).toBeCloseTo(wallFace)
        for (const mesh of meshes) {
          for (const name of ['position', 'normal', 'uv']) {
            expect([...mesh.geometry.getAttribute(name).array].every(Number.isFinite)).toBe(true)
          }
        }
      } finally {
        world.free()
        material.dispose()
        geometry.dispose()
      }
    })
  }
  for (const wall of walls.filter(wall => wall.holes?.length)) {
    test(`${wall.id}: doorway reveals have exactly one visible face through the plaster, baseboard and plinth`, () => {
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial
      try {
        const meshes = [geometry.surface, ...geometry.trim].map(geometry => new Mesh(geometry, material))
        for (const hole of wall.holes!) {
          for (const side of [-1, 1]) {
            for (const offsetY of [0.173, 0.393, 0.417, 0.613, 1.731].filter(value => value < hole.height - (hole.bottom ?? 0))) {
              const y = (hole.bottom ?? 0) + offsetY
              for (const z of [0.051, 0.092, 0.121, 0.183, 0.231, 0.259, 0.301]) {
                const classicDepth = y < 0.4 ? 0.325 : 0.27
                let depth = wall.trimStyle === 'plain' ? 0.25 : classicDepth
                if (wall.trimStyle === 'none') {
                  depth = wallFace
                }
                const ray = new Raycaster(new Vector3(hole.u, y, z), new Vector3(side, 0, 0), 0, hole.width / 2 + 0.4)
                const hits = ray.intersectObjects(meshes)
                expect(hits.length).toBe(z < depth ? 1 : 0)
                if (hits.length) {
                  const radius = hole.width / 2
                  const aboveSpring = y - (hole.height - radius)
                  if (hole.profile === 'arch' && aboveSpring > 0) {
                    // Wider arches start curving lower; their reveal is not a vertical jamb.
                    const reach = Math.sqrt(radius ** 2 - aboveSpring ** 2)
                    expect(Math.abs(hits[0].distance - reach)).toBeLessThan(0.001)
                  } else {
                    expect(hits[0].distance).toBeCloseTo(radius, 5)
                  }
                }
              }
            }
          }
        }
      } finally {
        material.dispose()
        geometry.dispose()
      }
    })
  }
  test('placement rays hit the solid arch shoulders, not the opening beneath them', () => {
    const wall = walls.find(wall => wall.id === 'lobby-east')!
    const hole = wall.holes![0]
    expect(openingTop(hole, hole.u)).toBeCloseTo(3.8)
    expect(openingTop(hole, hole.u + 1.2)).toBeLessThan(3.2)
    expect(findPlacement([5, 3.5, 4.2], [1, 0, 0], 0, 0, [])?.wallId).toBe(wall.id)
    expect(findPlacement([5, 3.5, 3], [1, 0, 0], 0, 0, [])).toMatchObject({
      wallId: 'dine-east',
      inReach: false,
      valid: false,
    })
  })
  test('supports multiple independent openings without leaving a bottom sill', () => {
    const wall = {
      ...walls[0],
      holes: [
        {
          u: -3,
          width: 2,
          height: 3.5,
          profile: 'arch' as const,
        }, {
          u: 3,
          width: 2.5,
          height: 3.6,
          profile: 'rectangle' as const,
        },
      ],
    }
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
