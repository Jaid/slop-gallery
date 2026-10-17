import type {Portrait} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry} from '../../src/lib/gallery/architecture.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {exhibitionRevision, upgradeDocument} from '../../src/lib/gallery/exhibitionUpdates.ts'
import {floorGlassThickness} from '../../src/lib/gallery/floors.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import salon from '../../src/lib/gallery/salon.ts'
import salonWindow, {salonWindowGlassDistance} from '../../src/lib/gallery/salonWindow.ts'
import {createDocument} from '../../src/lib/gallery/store.ts'
import walls, {findPlacement, insideOpening, placementIssue, rooms, wallCoordinates, wallPosition} from '../../src/lib/gallery/walls.ts'
import {createArchitecturalGlassMaterials, disposeArchitecturalGlassMaterials} from '../../src/lib/materials/ArchitecturalGlassMaterials.ts'
import CastFloorGlassMaterial from '../../src/lib/materials/CastFloorGlassMaterial.ts'

const lobbySide = walls.find(wall => wall.id === 'lobby-extension-east')!
const salonSide = walls.find(wall => wall.id === 'salon-west')!
const salonRoom = rooms.find(room => room.id === 'salon')!
const windowCenter = [salonWindow.x, (salonWindow.bottom + salonWindow.top) / 2, salonWindow.z] as const
/** A save from before the glass wall: the Salon’s north wall at z = −20 and the corgi where the window now is. */
const previousSave = () => {
  const document = createDocument()
  return structuredClone({
    ...document,
    exhibition: exhibitionRevision - 1,
    portraits: document.portraits.map((p): Portrait => {
      if (p.wallId === 'salon-north') {
        return {
          ...p,
          position: [p.position[0], p.position[1], -19.78],
        }
      }
      if (p.id === 'corgi' || p.id === 'penguins') {
        return {
          ...p,
          position: [p.position[0], p.position[1], -17.9],
        }
      }
      return p
    }),
  })
}
describe('the glass wall between the Lobby and the Salon', () => {
  test('lines up with the floor window, edge to edge along z', () => {
    expect(salonWindow.z - salonWindow.width / 2).toBe(lobby.opening.center[1] - lobby.opening.size[1] / 2)
    expect(salonWindow.z + salonWindow.width / 2).toBe(lobby.opening.center[1] + lobby.opening.size[1] / 2)
    // Whole pavers fill both, so their joints meet at the wall.
    expect(salonWindow.width / salonWindow.tileSize % 1).toBe(0)
    expect((salonWindow.top - salonWindow.bottom) / salonWindow.tileSize % 1).toBe(0)
    expect(lobby.opening.size[0] / salonWindow.tileSize % 1).toBe(0)
  })
  test('stands centered in both walls and the enlarged Salon', () => {
    expect(salonWindow.x).toBe(lobby.width / 2)
    expect(salonRoom.center[1]).toBe(salonWindow.z)
    expect(salonRoom.center[0] - salonRoom.size[0] / 2).toBe(salonWindow.x)
    // The Salon still backs onto Dine and now spans the whole Lobby extension.
    expect(salonRoom.center[1] + salonRoom.size[1] / 2).toBe(lobby.previousNorthZ)
    expect(salonRoom.center[1] - salonRoom.size[1] / 2).toBe(lobby.northZ)
    expect(salon.center).toEqual(salonRoom.center)
    for (const wall of [lobbySide, salonSide]) {
      expect(wall.center[0]).toBe(salonWindow.x)
      expect(wall.center[2]).toBe(salonWindow.z)
      expect(wall.holes).toHaveLength(1)
      const [hole] = wall.holes!
      expect(hole.u).toBeCloseTo(0, 12)
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
    expect(salonWindowGlassDistance([4, 2.7, -20], [1, 0, 0])).toBeCloseTo(4 - floorGlassThickness / 2)
    expect(salonWindowGlassDistance([12, 2.7, -20], [-1, 0, 0])).toBeCloseTo(4 - floorGlassThickness / 2)
    expect(salonWindowGlassDistance([4, 0.8, -20], [1, 0, 0])).toBeUndefined()
    expect(salonWindowGlassDistance([4, 2.7, -20], [-1, 0, 0])).toBeUndefined()
    expect(findPlacement([4, 2.7, -20], [1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'lobby-extension-east',
      valid: false,
      reason: 'Keep the window clear.',
    })
    expect(findPlacement([12, 2.7, -18], [-1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'salon-west',
      valid: false,
      reason: 'Keep the window clear.',
    })
    // Beside it and below it the walls stay what they were.
    expect(findPlacement([12, 2.7, -12], [-1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'salon-west',
      valid: true,
    })
    expect(findPlacement([4, 2.7, -28], [1, 0, 0], 1, 1, [])).toMatchObject({
      wallId: 'lobby-extension-east',
      valid: true,
    })
    // An artwork reaching over the window’s edge is turned away.
    expect(placementIssue(salonSide, wallPosition(salonSide, wallCoordinates(salonSide, [8, 0, -15.5]), 2.7), 1, 1, [])).not.toBe('')
  })
  test('the shipped collection hangs clear of it', () => {
    for (const p of initialPortraits) {
      const wall = [salonSide, lobbySide].find(candidate => candidate.id === p.wallId)
      if (!wall) {
        continue
      }
      expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits, p.id)).toBe('')
    }
  })
})
describe('saved collections catch up with the larger Salon', () => {
  test('the old save no longer fits the new walls', () => {
    expect(() => validateDocument(previousSave())).toThrow()
  })
  test('works on the moved north wall move with it, and the corgi steps aside from the window', () => {
    const before = previousSave()
    const upgraded = validateDocument(upgradeDocument(before))
    expect(upgraded.exhibition).toBe(exhibitionRevision)
    expect(upgraded.portraits.map(p => p.id)).toEqual(before.portraits.map(p => p.id))
    for (const p of upgraded.portraits) {
      if (p.wallId !== 'salon-north') {
        continue
      }
      expect(p.position[2]).toBeCloseTo(-31.78)
      expect(p.position[0]).toBe(initialPortraits.find(candidate => candidate.id === p.id)!.position[0])
    }
    const corgi = upgraded.portraits.find(p => p.id === 'corgi')!
    expect(corgi.hung).toBe(true)
    expect(corgi.wallId).toBe('salon-west')
    expect(placementIssue(salonSide, corgi.position, corgi.width, corgi.height, upgraded.portraits, corgi.id)).toBe('')
    // It moves the shortest way, south past the window’s edge at z = −16, into the first gap between the Salon’s columns.
    expect(corgi.position[2]).toBeGreaterThan(-16)
    expect(corgi.position[2]).toBeLessThan(-10.1)
    // The penguins’ wall has no window; they stay where the visitor last saw them.
    expect(upgraded.portraits.find(p => p.id === 'penguins')!.position[2]).toBe(-17.9)
  })
  test('a visitor’s own work on the Lobby side of the window moves along the wall beside it', () => {
    const before = previousSave()
    const own: Portrait = {
      ...initialPortraits[0],
      id: 'visitor-own-work',
      wallId: 'lobby-extension-east',
      position: wallPosition(lobbySide, 0, 2.7),
      rotation: lobbySide.rotation,
      width: 4,
      height: 2,
      hung: true,
      orientation: undefined,
    }
    const upgraded = validateDocument(upgradeDocument({
      ...before,
      portraits: [...before.portraits, own],
    }))
    const work = upgraded.portraits.find(p => p.id === own.id)!
    expect(work.hung).toBe(true)
    expect(work.wallId).toBe('lobby-extension-east')
    expect(placementIssue(lobbySide, work.position, work.width, work.height, upgraded.portraits, work.id)).toBe('')
    expect(Math.abs(work.position[2] - salonWindow.z)).toBeGreaterThan(salonWindow.width / 2 + work.width / 2)
  })
  test('works already on the new north wall stay put, so older saves gaining the Salon’s works are not moved twice', () => {
    const current = createDocument()
    expect(upgradeDocument({
      ...current,
      exhibition: exhibitionRevision - 1,
    })).toEqual(current)
  })
})

