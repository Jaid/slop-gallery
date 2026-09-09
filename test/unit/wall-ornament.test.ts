import {describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import {wallOrnament, WallOrnamentGeometry, wallOrnamentPositions} from '../../src/lib/gallery/WallOrnamentGeometry.ts'
import {walls} from '../../src/lib/gallery/walls.ts'

describe('cabinet wall ornaments', () => {
  test('keeps the relief just above the baseboard and behind hung artwork', () => {
    const geometry = new WallOrnamentGeometry
    try {
      let triangles = 0
      for (const part of [geometry.foliage, geometry.brass]) {
        const bounds = part.boundingBox!
        expect(bounds.min.x).toBeCloseTo(-bounds.max.x, 5)
        expect(bounds.max.x).toBeLessThan(wallOrnament.halfWidth)
        expect(bounds.min.y).toBeGreaterThan(-wallOrnament.halfHeight)
        expect(bounds.max.y).toBeLessThan(wallOrnament.halfHeight)
        expect(bounds.min.y + wallOrnament.height).toBeGreaterThan(0.44)
        expect(bounds.max.y + wallOrnament.height).toBeLessThan(1.3)
        expect(bounds.min.z).toBeGreaterThan(0)
        // Hanging frames sit at 0.22 with an 0.08 half-depth.
        expect(bounds.max.z + wallFace + 0.002).toBeLessThan(0.14)
        for (const attribute of ['position', 'normal', 'uv']) {
          expect([...part.getAttribute(attribute).array].every(Number.isFinite)).toBe(true)
        }
        const normal = new Vector3
        const normals = part.getAttribute('normal')
        for (let i = 0; i < normals.count; i++) {
          expect(normal.fromBufferAttribute(normals, i).length()).toBeCloseTo(1, 5)
        }
        triangles += part.getAttribute('position').count / 3
      }
      expect(triangles).toBeLessThan(25_000)
    } finally {
      geometry.dispose()
    }
  })
  test('leaves open plaster between the carved motifs instead of a rectangular backing', () => {
    const geometry = new WallOrnamentGeometry
    const material = new MeshBasicMaterial
    try {
      const meshes = [geometry.foliage, geometry.brass].map(part => new Mesh(part, material))
      const ray = (x: number, y: number) => new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1)).intersectObjects(meshes)
      expect(ray(0, 0).length).toBeGreaterThan(0)
      expect(ray(0.7, 0.2)).toHaveLength(0)
      expect(ray(-0.7, 0.2)).toHaveLength(0)
      expect(ray(0.4, -0.35)).toHaveLength(0)
    } finally {
      geometry.dispose()
      material.dispose()
    }
  })
  test('places exactly eight low ornaments near corners and clears the full doorway trim', () => {
    const cabinetWalls = walls.filter(candidate => candidate.room === 'cabinet')
    expect(cabinetWalls.flatMap(wallOrnamentPositions)).toHaveLength(8)
    for (const wall of cabinetWalls) {
      const positions = wallOrnamentPositions(wall)
      expect(positions).toHaveLength(2)
      expect(positions[0]).toBeCloseTo(wall.id === 'cabinet-south' ? -1.4 : -wall.width / 2 + 1)
      expect(positions[1]).toBeCloseTo(wall.width / 2 - 1)
      for (const [i, x] of positions.entries()) {
        expect(Math.abs(x) + wallOrnament.halfWidth).toBeLessThanOrEqual(wall.width / 2 - wallOrnament.clearance)
        if (i > 0) {
          expect(x - positions[i - 1]!).toBeGreaterThanOrEqual(wallOrnament.spacing)
        }
        for (const hole of wall.holes ?? []) {
          expect(Math.abs(x - hole.u)).toBeGreaterThanOrEqual(hole.width / 2 + wallOrnament.halfWidth + wallOrnament.clearance - 1e-9)
        }
      }
    }
    expect(wallOrnamentPositions({
      ...walls[0]!,
      width: 1,
    })).toEqual([])
    expect(wallOrnamentPositions({
      ...walls[0]!,
      width: 4,
      holes: [
        {
          u: 0,
          width: 3,
          height: 5,
          profile: 'rectangle',
        },
      ],
    })).toEqual([])
  })
  test('releases both shared geometry buffers', () => {
    const geometry = new WallOrnamentGeometry
    let disposed = 0
    for (const part of [geometry.foliage, geometry.brass]) {
      part.addEventListener('dispose', () => disposed++)
    }
    geometry.dispose()
    expect(disposed).toBe(2)
  })
})
