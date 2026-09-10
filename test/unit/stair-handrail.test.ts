import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {computeMeshVolume} from 'three-bvh-csg'
import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {colliderGeometry} from '../../src/lib/gallery/architecture.ts'
import {stairFlights, stairRailGeometry, stairTurn} from '../../src/lib/gallery/staircase.ts'
import {StairHandrailGeometry} from '../../src/lib/gallery/stairs/StairHandrailGeometry.ts'

await RAPIER.init()
describe('continuous stair handrails', () => {
  for (const side of ['inner', 'outer'] as const) {
    test(`${side}: one watertight solid with no internal join caps or mismatched profiles`, () => {
      const geometry = stairRailGeometry(side)
      try {
        const [positions, indices] = colliderGeometry(geometry)
        const edges = new Map<string, {count: number
          direction: number}>
        for (let i = 0; i < indices.length; i += 3) {
          const triangle = [indices[i]!, indices[i + 1]!, indices[i + 2]!]
          expect(triangle.every(index => Math.abs(positions[index * 3]! - stairTurn.center[0]) < 0.000_01)).toBe(false)
          for (let edge = 0; edge < 3; edge++) {
            const a = triangle[edge]!
            const b = triangle[(edge + 1) % 3]!
            const key = [Math.min(a, b), Math.max(a, b)].join(':')
            const value = edges.get(key) ?? {
              count: 0,
              direction: 0,
            }
            value.count++
            value.direction += a < b ? 1 : -1
            edges.set(key, value)
          }
        }
        for (const edge of edges.values()) {
          expect(edge).toEqual({
            count: 2,
            direction: 0,
          })
        }
        for (const attribute of Object.values(geometry.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
        }
        const normals = geometry.getAttribute('normal')
        for (let i = 0; i < normals.count; i++) {
          expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5)
        }
        const radius = side === 'inner' ? stairTurn.innerRadius + 0.22 : stairTurn.outerRadius - 0.22
        const segments = Math.ceil(Math.PI * 32)
        const length = stairFlights.reduce((sum, flight) => sum + flight.length, 0)
        expect(Number(computeMeshVolume(geometry))).toBeCloseTo(0.065 ** 2 * (length + radius * segments * Math.sin(Math.PI / segments)), 5)
      } finally {
        geometry.dispose()
      }
    })
    test(`${side}: rendering and collision meet continuously above and below both grade joins`, () => {
      const geometry = stairRailGeometry(side)
      const material = new MeshBasicMaterial
      const mesh = new Mesh(geometry, material)
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      world.createCollider(RAPIER.ColliderDesc.trimesh(...colliderGeometry(geometry), RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES))
      world.step()
      try {
        const radius = side === 'inner' ? stairTurn.innerRadius + 0.22 : stairTurn.outerRadius - 0.22
        const centerZ = side === 'inner' ? stairTurn.innerCenterZ : stairTurn.outerCenterZ
        for (const [i, flight] of stairFlights.entries()) {
          for (const dx of [-0.04, -0.01, 0, 0.01, 0.04]) {
            const z = centerZ + (i === 0 ? -1 : 1) * (dx <= 0 ? radius : Math.sqrt(radius ** 2 - dx ** 2))
            const y = stairTurn.top + 1 + (dx < 0 ? dx * flight.slope : 0)
            for (const across of [-0.017, 0.013]) {
              for (const direction of [-1, 1]) {
                const origin = new Vector3(stairTurn.center[0] + dx, y - direction, z + across)
                const aim = new Vector3(0, direction, 0)
                const hit = new Raycaster(origin, aim, 0, 2).intersectObject(mesh)[0]!
                expect(hit.distance).toBeCloseTo(1 - 0.065 / 2, 5)
                expect(world.castRay(new RAPIER.Ray(origin, aim), 2, true)!.timeOfImpact).toBeCloseTo(hit.distance, 5)
              }
            }
          }
        }
      } finally {
        world.free()
        material.dispose()
        geometry.dispose()
      }
    })
  }
  test('rejects invalid or reversed flight extents', () => {
    expect(() => new StairHandrailGeometry(stairTurn, 'inner', [Infinity, 0], [6, -8])).toThrow(RangeError)
    expect(() => new StairHandrailGeometry(stairTurn, 'outer', [stairTurn.center[0], 0], [6, -8])).toThrow(RangeError)
    expect(() => new StairHandrailGeometry(stairTurn, 'inner', [4, 0], [stairTurn.center[0] + 1, -8])).toThrow(RangeError)
  })
})
