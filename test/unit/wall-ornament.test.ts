import {describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {wallFace, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import {cabinetOrnaments} from '../../src/lib/gallery/cabinetOrnaments.ts'
import {wallOrnament, WallOrnamentGeometry, wallOrnamentPositions} from '../../src/lib/gallery/WallOrnamentGeometry.ts'
import {wallCoordinates, wallPosition, walls} from '../../src/lib/gallery/walls.ts'

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
  test('the default corner layout clears the full doorway trim', () => {
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
  test('matches corner clearance on both sides of the east doorway and keeps the other five unchanged', () => {
    expect(cabinetOrnaments).toHaveLength(7)
    const eastWall = walls.find(wall => wall.id === 'cabinet-east')!
    const east = cabinetOrnaments.filter(ornament => ornament.wallId === eastWall.id)
    expect(east).toHaveLength(2)
    const placed = east[0]!
    expect(placed.position[0]).toBeCloseTo(-8.107, 6)
    expect(placed.position[1]).toBe(wallOrnament.height)
    expect(cabinetOrnaments.every(ornament => ornament.position[1] === wallOrnament.height)).toBe(true)
    expect(placed.position[2]).toBeCloseTo(0.43, 10)
    expect(placed.rotation).toBe(eastWall.rotation)
    expect(east[1]!.position[2]).toBeCloseTo(5.57, 10)
    const doorway = eastWall.holes![0]!
    expect((wallCoordinates(eastWall, placed.position) + wallCoordinates(eastWall, east[1]!.position)) / 2).toBeCloseTo(doorway.u, 10)
    const cornerWall = walls.find(wall => wall.id === 'cabinet-north')!
    const corner = cabinetOrnaments.find(ornament => ornament.wallId === cornerWall.id)!
    const cornerGap = cornerWall.width / 2 - Math.abs(wallCoordinates(cornerWall, corner.position)) - wallOrnament.halfWidth
    for (const ornament of east) {
      const u = wallCoordinates(eastWall, ornament.position)
      const doorGap = Math.abs(u - doorway.u) - doorway.width / 2 - wallOpeningTrim - wallOrnament.halfWidth
      expect(doorGap).toBeCloseTo(wallOrnament.clearance, 10)
      expect(doorGap).toBeCloseTo(cornerGap, 10)
    }
    for (const wall of walls.filter(candidate => candidate.room === 'cabinet')) {
      const ornaments = cabinetOrnaments.filter(ornament => ornament.wallId === wall.id)
      const defaults = wallOrnamentPositions(wall)
      if (wall.id === 'cabinet-south') {
        defaults.shift()
      }
      for (const [index, ornament] of ornaments.entries()) {
        if (wall.id === eastWall.id) {
          continue
        }
        expect(ornament.position).toEqual(wallPosition(wall, defaults[index]!, wallOrnament.height, wallFace + 0.002))
      }
    }
  })
  test('removes only the south-wall ornament beside the Amber Room doorway', () => {
    const wall = walls.find(candidate => candidate.id === 'cabinet-south')!
    const remaining = cabinetOrnaments.filter(ornament => ornament.wallId === wall.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.position).toEqual(wallPosition(wall, 5, wallOrnament.height, wallFace + 0.002))
    expect(cabinetOrnaments.some(ornament => Math.abs(ornament.position[0] + 12.6) < 0.001 && Math.abs(ornament.position[2] - 7.893) < 0.001)).toBe(false)
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
