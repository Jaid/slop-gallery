import {describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import {floorGlassThickness} from '../../src/lib/gallery/floors.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import salon from '../../src/lib/gallery/salon.ts'
import salonWindow, {salonWindowGlassDistance} from '../../src/lib/gallery/salonWindow.ts'
import walls, {galleryPlacement, insideOpening, placementIssue, rooms, wallCoordinates, wallPosition} from '../../src/lib/gallery/walls.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '../../src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastFloorGlassMaterial from '../../src/lib/materials/CastFloorGlassMaterial.ts'
import samplePortraits from './fixtures/portraits.ts'

const lobbySide = walls.find(wall => wall.id === 'lobby-extension-east')!
const salonSide = walls.find(wall => wall.id === 'salon-west')!
const salonRoom = rooms.find(room => room.id === 'salon')!
const windowCenter = [salonWindow.x, (salonWindow.bottom + salonWindow.top) / 2, salonWindow.z] as const
describe('the glass wall between the Lobby and the Salon', () => {
  test('lines up with the floor window, edge to edge along z', () => {
    expect(salonWindow.z - salonWindow.width / 2).toBe(lobby.opening.center[1] - lobby.opening.size[1] / 2)
    expect(salonWindow.z + salonWindow.width / 2).toBe(lobby.opening.center[1] + lobby.opening.size[1] / 2)
    // Whole pavers fill both, so their joints meet at the wall.
    expect(salonWindow.width / salonWindow.tileSize % 1).toBe(0)
    expect((salonWindow.top - salonWindow.bottom) / salonWindow.tileSize % 1).toBe(0)
    expect(lobby.opening.size[0] / salonWindow.tileSize % 1).toBe(0)
  })
  test('stands centered in the Salon, cut through both walls', () => {
    expect(salonWindow.x).toBe(lobby.width / 2)
    expect(salonRoom.center[1]).toBe(salonWindow.z)
    expect(salonRoom.center[0] - salonRoom.size[0] / 2).toBe(salonWindow.x)
    // The Salon reaches from the Lobby’s north wall as far south of the window.
    expect(salonRoom.center[1] - salonRoom.size[1] / 2).toBe(lobby.northZ)
    expect(salon.center).toEqual(salonRoom.center)
    for (const wall of [lobbySide, salonSide]) {
      expect(wall.center[0]).toBe(salonWindow.x)
      expect(wallPosition(wall, wall.holes![0].u, 0)[2]).toBeCloseTo(salonWindow.z, 12)
      expect(wall.holes).toHaveLength(1)
      const [hole] = wall.holes!
      expect(hole.u).toBeCloseTo(wall === salonSide ? 0 : wallCoordinates(wall, [...windowCenter]), 12)
      expect(hole.width).toBe(salonWindow.width)
      expect(insideOpening(hole, wallCoordinates(wall, [...windowCenter]), windowCenter[1])).toBe(true)
      // The sill stays above the Salon’s chair rail and its frame below the cornice.
      expect(hole.bottom).toBe(salonWindow.bottom)
      expect(hole.height).toBe(salonWindow.top)
      expect(wall.height - hole.height).toBeGreaterThan(0.6)
    }
  })
  test('is cut through both walls, leaving glass where the wall was', () => {
    const material = new MeshBasicMaterial
    const geometries = [lobbySide, salonSide].map(createArchitectureGeometry)
    const meshes = geometries.flatMap((geometry, i) => [geometry.surface, ...geometry.trim].map(part => {
      const wall = [lobbySide, salonSide][i]
      const mesh = new Mesh(part, material)
      mesh.position.set(...wall.center)
      mesh.rotation.y = wall.rotation
      mesh.updateMatrixWorld(true)
      return mesh
    }))
    try {
      const sight = (y: number, z: number) => {
        const ray = new Raycaster(new Vector3(4, y, z), new Vector3(1, 0, 0), 0, 8)
        return ray.intersectObjects(meshes).length
      }
      expect(sight(2.7, salonWindow.z)).toBe(0)
      expect(sight(1.4, salonWindow.z - 3.8)).toBe(0)
      expect(sight(4, salonWindow.z + 3.8)).toBe(0)
      expect(sight(0.6, salonWindow.z)).toBeGreaterThan(0)
      expect(sight(4.8, salonWindow.z)).toBeGreaterThan(0)
      expect(sight(2.7, salonWindow.z + 4.5)).toBeGreaterThan(0)
    } finally {
      for (const geometry of geometries) {
        geometry.dispose()
      }
      material.dispose()
    }
  })
  test('is cast from the floor window’s glass', () => {
    for (const isHeavy of [true, false]) {
      const materials = createArchitecturalGlassMaterials(isHeavy)
      try {
        expect(materials.salon.constructor).toBe(materials.lobby.constructor)
        if (isHeavy) {
          expect(materials.salon).toBeInstanceOf(CastFloorGlassMaterial)
          expect(materials.salon).not.toBe(materials.lobby)
          expect(materials.salon.depthWrite).toBe(false)
        }
      } finally {
        disposeArchitecturalGlassMaterials(materials)
      }
    }
    expect(salonWindow.thickness).toBe(floorGlassThickness)
  })
  test('stops the aim at its glass from both sides, while the wall around it still takes artworks', () => {
    expect(salonWindowGlassDistance([4, 2.7, -24], [1, 0, 0])).toBeCloseTo(4 - floorGlassThickness / 2)
    expect(salonWindowGlassDistance([12, 2.7, -24], [-1, 0, 0])).toBeCloseTo(4 - floorGlassThickness / 2)
    expect(salonWindowGlassDistance([4, 0.8, -24], [1, 0, 0])).toBeUndefined()
    expect(salonWindowGlassDistance([4, 2.7, -24], [-1, 0, 0])).toBeUndefined()
    expect(galleryPlacement.findPlacement([4, 2.7, -24], [1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'lobby-extension-east',
      valid: false,
      reason: 'Keep the window clear.',
    })
    expect(galleryPlacement.findPlacement([12, 2.7, -22], [-1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'salon-west',
      valid: false,
      reason: 'Keep the window clear.',
    })
    // Beside it and below it the walls stay what they were.
    expect(galleryPlacement.findPlacement([12, 2.7, -17.5], [-1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'salon-west',
      valid: true,
    })
    expect(galleryPlacement.findPlacement([4, 2.7, -12], [1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'lobby-extension-east',
      valid: true,
    })
    // An artwork reaching over the window’s edge is turned away.
    expect(placementIssue(salonSide, wallPosition(salonSide, wallCoordinates(salonSide, [8, 0, -19.5]), 2.7), 1, 1, [])).not.toBe('')
  })
  test('the shipped collection hangs clear of it', () => {
    for (const p of samplePortraits) {
      const wall = [salonSide, lobbySide].find(candidate => candidate.id === p.wallId)
      if (!wall) {
        continue
      }
      expect(placementIssue(wall, p.position, p.width, p.height, samplePortraits, p.id)).toBe('')
    }
  })
})
