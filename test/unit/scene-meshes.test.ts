import {describe, expect, test} from 'bun:test'

import {MeshBVH} from 'three-mesh-bvh'
import {Box3, Mesh, MeshBasicMaterial, Raycaster, TorusKnotGeometry, Vector3} from 'three/webgpu'

import ChandelierGeometry from '../../src/lib/gallery/ChandelierGeometry.ts'
import {knotGeometryArgs} from '../../src/lib/gallery/sculptures.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import {chandelierPhysics} from '../../src/lib/physics/chandelier.ts'

describe('chandelier geometry', () => {
  test('the suspended fixture and fixed canopy retain their geometry and triangle budget', () => {
    const geometry = new ChandelierGeometry
    try {
      const parts = [geometry.brass, geometry.candles, geometry.flames, geometry.pendant, geometry.canopy]
      const bounds = new Box3
      let triangles = 0
      let bytes = 0
      for (const part of parts) {
        triangles += triangleCount(part)
        expect(part.index).not.toBeNull()
        bytes += part.index!.array.byteLength
        const positions = part.getAttribute('position')
        expect([...part.index!.array].every(index => index < positions.count)).toBe(true)
        for (const attribute of Object.values(part.attributes)) {
          expect([...attribute.array].every(Number.isFinite)).toBe(true)
          bytes += attribute.array.byteLength
        }
        const normal = new Vector3
        const normals = part.getAttribute('normal')
        for (let i = 0; i < normals.count; i++) {
          expect(normal.fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 5)
        }
        part.computeBoundingBox()
        bounds.union(part.boundingBox!)
      }
      expect(triangles).toBeLessThan(7500)
      expect(bytes).toBeLessThan(240_000)
      expect(bounds.min.y).toBeCloseTo(-0.506, 5)
      expect(bounds.max.y).toBeCloseTo(2.13, 5)
      expect(bounds.max.y + chandelierPhysics.height).toBeCloseTo(5.68, 5)
      expect(bounds.max.x).toBeCloseTo(1.39, 5)
      expect(bounds.min.x).toBeCloseTo(-1.39, 5)
    } finally {
      geometry.dispose()
    }
  })
  test('all eight arms still end in a saucer, candle and flame at their original locations', () => {
    const geometry = new ChandelierGeometry
    const material = new MeshBasicMaterial
    try {
      const brass = new Mesh(geometry.brass, material)
      const candles = new Mesh(geometry.candles, material)
      const flames = new Mesh(geometry.flames, material)
      for (let i = 0; i < 8; i++) {
        const position = new Vector3(1.25, 2, 0).applyAxisAngle(new Vector3(0, 1, 0), i * Math.PI / 4)
        const ray = new Raycaster(position, new Vector3(0, -1, 0))
        expect(ray.intersectObject(brass)[0].point.y).toBeCloseTo(0.21, 5)
        expect(ray.intersectObject(candles)[0].point.y).toBeCloseTo(0.44, 5)
        expect(ray.intersectObject(flames)[0].point.y).toBeCloseTo(0.615, 5)
      }
    } finally {
      geometry.dispose()
      material.dispose()
    }
  })
  test('releases all five owned geometries', () => {
    const geometry = new ChandelierGeometry
    let disposed = 0
    for (const part of [geometry.brass, geometry.candles, geometry.flames, geometry.pendant, geometry.canopy]) {
      part.addEventListener('dispose', () => disposed++)
    }
    geometry.dispose()
    expect(disposed).toBe(5)
  })
})
describe('gold knot tessellation', () => {
  test('retains the winding and stays within 4 mm of the original surface in both directions', () => {
    const original = new TorusKnotGeometry(0.45, 0.13, 256, 48, 2, 3)
    const optimized = new TorusKnotGeometry(...knotGeometryArgs)
    try {
      expect(optimized.parameters.radius).toBe(original.parameters.radius)
      expect(optimized.parameters.tube).toBe(original.parameters.tube)
      expect(optimized.parameters.p).toBe(original.parameters.p)
      expect(optimized.parameters.q).toBe(original.parameters.q)
      expect(triangleCount(optimized)).toBeLessThanOrEqual(32_768)
      for (const [from, to] of [[original, optimized], [optimized, original]] as const) {
        const bvh = new MeshBVH(to)
        const point = new Vector3
        const positions = from.getAttribute('position')
        let maximum = 0
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i)
          maximum = Math.max(maximum, bvh.closestPointToPoint(point)!.distance)
        }
        expect(maximum).toBeLessThan(0.004)
      }
    } finally {
      original.dispose()
      optimized.dispose()
    }
  })
})
