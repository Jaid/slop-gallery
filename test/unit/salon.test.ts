import type {Portrait} from '../../src/lib/gallery/types.ts'

import {beforeEach, describe, expect, test} from 'bun:test'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {exhibitionRevision, exhibitionUpdates, upgradeDocument} from '../../src/lib/gallery/exhibitionUpdates.ts'
import {validateDocument} from '../../src/lib/gallery/GalleryRepository.ts'
import {portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {salonBench, salonCeiling, salonLaylight, salonLightOffsets, salonLightY, salonWainscot, wainscotFields, wallDressingSpans} from '../../src/lib/gallery/salon.ts'
import {createDocument, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'
import walls, {floorHeight, insideGallery, insideOpening, placementIssue, roomAt, rooms, roomVisit, wallCoordinates, wallPosition} from '../../src/lib/gallery/walls.ts'
import ParquetFloorMaterial, {herringboneBlock, salonParquet} from '../../src/lib/materials/ParquetFloorMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'salon')!
const salonArtworks = exhibitionUpdates[0].artworks
const shipped = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
}
/** A save from before the Salon: no exhibition revision, no Salon works and the bread where Dine’s north wall now has its arch. */
const legacySave = () => {
  const {exhibition: _, ...document} = createDocument()
  return structuredClone({
    ...document,
    portraits: initialPortraits.filter(p => !salonArtworks.includes(p.id)).map(p => (p.id === 'bread' ? {
      ...p,
      position: [16, 2.6, -7.78],
    } : p)),
  })
}
beforeEach(() => {
  restoreDocument(shipped)
  useGallery.setState({sound: false})
})
describe('the Salon', () => {
  test('sits north of Dine on the upper floor, beside the Lobby extension and above no lower room', () => {
    const dine = rooms.find(candidate => candidate.id === 'dine')!
    expect(room.floorY).toBe(0)
    expect(room.center[0]).toBe(dine.center[0])
    expect(room.center[1] + room.size[1] / 2).toBe(dine.center[1] - dine.size[1] / 2)
    expect(room.center[0] - room.size[0] / 2).toBe(8)
    const upper = rooms.filter(candidate => candidate.floorY === 0 && candidate.id !== 'salon')
    for (const other of upper) {
      const overlapX = Math.min(room.center[0] + room.size[0] / 2, other.center[0] + other.size[0] / 2) - Math.max(room.center[0] - room.size[0] / 2, other.center[0] - other.size[0] / 2)
      const overlapZ = Math.min(room.center[1] + room.size[1] / 2, other.center[1] + other.size[1] / 2) - Math.max(room.center[1] - room.size[1] / 2, other.center[1] - other.size[1] / 2)
      expect(Math.min(overlapX, overlapZ)).toBeLessThanOrEqual(0)
    }
    for (const [x, z] of [[8.5, -19.5], [19.5, -8.5], [14, -14]]) {
      expect(roomAt([x, 1.7, z])).toBe('salon')
      expect(floorHeight([x, 1.7, z])).toBe(0)
    }
    expect(insideGallery([20.5, 1.7, -14])).toBe(false)
    expect(insideGallery([14, 1.7, -20.5])).toBe(false)
  })
  test('the floor-plan visit lands inside the Salon, looking at its north wall', () => {
    const visit = roomVisit(room)
    expect(roomAt(visit.position)).toBe('salon')
    expect(visit.position[2]).toBeGreaterThan(salonBench.position[2] + salonBench.depth / 2 + 0.5)
  })
  test('one shared arch joins Dine and the Salon, back to back on the same plane', () => {
    const dineNorth = walls.find(wall => wall.id === 'dine-north')!
    const salonSouth = walls.find(wall => wall.id === 'salon-south')!
    expect(dineNorth.center).toEqual(salonSouth.center)
    expect(Math.abs(Math.cos(dineNorth.rotation - salonSouth.rotation) + 1)).toBeLessThan(1e-12)
    const doorway = [14, 1.7, -8] as const
    for (const wall of [dineNorth, salonSouth]) {
      expect(wall.holes).toHaveLength(1)
      expect(insideOpening(wall.holes![0], wallCoordinates(wall, [...doorway]), 1.7)).toBe(true)
    }
    expect(roomAt([14, 1.7, -7.9])).toBe('dine')
    expect(roomAt([14, 1.7, -8.1])).toBe('salon')
    // Its west wall backs the Lobby extension the same way.
    const salonWest = walls.find(wall => wall.id === 'salon-west')!
    const lobbyEast = walls.find(wall => wall.id === 'lobby-extension-east')!
    expect(salonWest.center[0]).toBe(lobbyEast.center[0])
    expect(Math.abs(Math.cos(salonWest.rotation - lobbyEast.rotation) + 1)).toBeLessThan(1e-12)
  })
  test('the Salon is hung frame to frame on all four walls, every work in a valid, labelled place', () => {
    const hung = initialPortraits.filter(p => p.wallId?.startsWith('salon-'))
    expect(hung.map(p => p.id).toSorted()).toEqual([...salonArtworks].toSorted())
    expect(new Set(hung.map(p => p.wallId))).toEqual(new Set(['salon-north', 'salon-east', 'salon-south', 'salon-west']))
    for (const p of hung) {
      const wall = walls.find(candidate => candidate.id === p.wallId)!
      expect(placementIssue(wall, p.position, p.width, p.height, initialPortraits, p.id)).toBe('')
      // Every lowest placard clears the chair rail, so no label sits on it.
      expect(p.position[1] + portraitLabelLayout(p.width, p.height).bottom).toBeGreaterThan(salonWainscot.railBottom + salonWainscot.railHeight + 0.02)
    }
    // Salon hang: on every wall, at least two works share a column.
    for (const wallId of ['salon-north', 'salon-east', 'salon-south', 'salon-west']) {
      const wall = walls.find(candidate => candidate.id === wallId)!
      const columns = new Map<number, number>
      for (const p of hung) {
        if (p.wallId !== wallId) {
          continue
        }
        const u = Math.round(wallCoordinates(wall, p.position) * 100)
        columns.set(u, (columns.get(u) ?? 0) + 1)
      }
      expect(Math.max(...columns.values())).toBeGreaterThanOrEqual(2)
    }
  })
  test('Dine’s works keep clear of the new arch', () => {
    const dineNorth = walls.find(wall => wall.id === 'dine-north')!
    for (const p of initialPortraits) {
      if (p.wallId !== 'dine-north') {
        continue
      }
      expect(placementIssue(dineNorth, p.position, p.width, p.height, [])).toBe('')
    }
    expect(placementIssue(dineNorth, wallPosition(dineNorth, 0, 2.6), 1, 1, [])).toContain('doorway')
  })
  test('the ottoman leaves the doorway path and the walls clear', () => {
    const {depth, position, width} = salonBench
    expect(position[2] - depth / 2 - (room.center[1] - room.size[1] / 2)).toBeGreaterThan(4)
    expect(room.center[1] + room.size[1] / 2 - (position[2] + depth / 2)).toBeGreaterThan(4)
    expect(Math.abs(position[0] - room.center[0]) + width / 2).toBeLessThan(room.size[0] / 2 - 3)
    expect(salonBench.seatHeight).toBeCloseTo(0.49, 5)
  })
  test('the laylight hangs inside the room, under its slab and above every lamp', () => {
    const {depth, frame, glassY, opening} = salonLaylight
    expect(opening / 2 + frame).toBeLessThan(room.size[0] / 2)
    expect(glassY).toBeLessThan(salonCeiling.underside)
    expect(salonCeiling.underside - depth).toBeGreaterThan(salonLightY + 0.6)
    for (const z of salonLightOffsets) {
      expect(Math.abs(z)).toBeLessThan(opening / 2)
    }
  })
  test('wainscot runs stop at the arch trim and fit between the corners', () => {
    const south = walls.find(wall => wall.id === 'salon-south')!
    const spans = wallDressingSpans(south, 0.17, wallFace)
    expect(spans).toHaveLength(2)
    expect(spans[0][0]).toBeCloseTo(-south.width / 2 + wallFace)
    expect(spans[0][1]).toBeCloseTo(-1.4 - 0.17)
    expect(spans[1][0]).toBeCloseTo(1.4 + 0.17)
    const north = walls.find(wall => wall.id === 'salon-north')!
    expect(wallDressingSpans(north, 0.17, wallFace)).toEqual([[-north.width / 2 + wallFace, north.width / 2 - wallFace]])
    for (const [start, end] of [...spans, [-6, 6] as const]) {
      const fields = wainscotFields(start, end)
      expect(fields.length).toBeGreaterThan(0)
      for (const [center, width] of fields) {
        expect(center - width / 2).toBeGreaterThanOrEqual(start + salonWainscot.margin - 1e-9)
        expect(center + width / 2).toBeLessThanOrEqual(end - salonWainscot.margin + 1e-9)
      }
    }
  })
})
describe('herringbone parquet', () => {
  test('every point lies in exactly one block, which contains it', () => {
    const {ratio} = salonParquet
    for (let i = 0; i < 4000; i++) {
      const x = Math.sin(i * 12.9898) * 120
      const y = Math.cos(i * 78.233) * 120
      const block = herringboneBlock(x, y, ratio)
      expect(block.along).toBeGreaterThanOrEqual(-1e-9)
      expect(block.along).toBeLessThan(ratio + 1e-9)
      expect(block.across).toBeGreaterThanOrEqual(-1e-9)
      expect(block.across).toBeLessThan(1 + 1e-9)
      // Reconstruct the block’s origin from its identity and check that the point is inside it.
      const originX = block.step + block.chain * ratio + (block.vertical ? ratio : 0)
      const originY = block.step - block.chain * ratio + (block.vertical ? 1 - ratio : 0)
      const [width, height] = block.vertical ? [1, ratio] : [ratio, 1]
      expect(x).toBeGreaterThanOrEqual(originX - 1e-9)
      expect(x).toBeLessThan(originX + width + 1e-9)
      expect(y).toBeGreaterThanOrEqual(originY - 1e-9)
      expect(y).toBeLessThan(originY + height + 1e-9)
    }
  })
  test('blocks touch along whole edges, in the herringbone pattern', () => {
    const {ratio} = salonParquet
    // Just right of a horizontal block’s end is the vertical block that it butts into.
    const horizontal = herringboneBlock(0.5, 0.5, ratio)
    expect(horizontal.vertical).toBe(false)
    const neighbor = herringboneBlock(ratio + 0.5, 0.5, ratio)
    expect(neighbor.vertical).toBe(true)
    expect(neighbor.chain).toBe(horizontal.chain)
    expect(neighbor.step).toBe(horizontal.step)
  })
  test('builds its surface nodes and rejects impossible blocks', () => {
    for (const reflections of [true, false]) {
      const material = new ParquetFloorMaterial(salonParquet, reflections)
      try {
        expect(material.colorNode).toBeTruthy()
        expect(material.normalNode).toBeTruthy()
        expect(material.roughnessNode).toBeTruthy()
        expect(Boolean(material.reflection)).toBe(reflections)
      } finally {
        material.dispose()
      }
    }
    for (const options of [{ratio: 1}, {ratio: 4.5}, {width: 0}]) {
      expect(() => new ParquetFloorMaterial({
        ...salonParquet,
        ...options,
      })).toThrow(RangeError)
    }
  })
})
describe('saved collections catch up with the Salon', () => {
  test('new documents record the current exhibition and round-trip', () => {
    const document = createDocument()
    expect(document.exhibition).toBe(exhibitionRevision)
    const saved = validateDocument(document)
    expect(saved.exhibition).toBe(exhibitionRevision)
    expect(validateDocument(saved)).toEqual(saved)
    expect(upgradeDocument(document)).toBe(document)
  })
  test('an older save gains the Salon’s works and its bread moves out of the arch', () => {
    const legacy = legacySave()
    expect(() => validateDocument(legacy)).toThrow('overlaps a doorway')
    const upgraded = validateDocument(upgradeDocument(legacy))
    expect(upgraded.exhibition).toBe(exhibitionRevision)
    expect(upgraded.portraits.map(p => p.id).toSorted()).toEqual(initialPortraits.map(p => p.id).toSorted())
    const bread = upgraded.portraits.find(p => p.id === 'bread')!
    const wall = walls.find(candidate => candidate.id === 'dine-north')!
    expect(bread.hung).toBe(true)
    expect(bread.wallId).toBe('dine-north')
    expect(placementIssue(wall, bread.position, bread.width, bread.height, upgraded.portraits, bread.id)).toBe('')
    // It moves the shortest way along the wall, away from the arch.
    expect(wallCoordinates(wall, bread.position)).toBeGreaterThan(2)
    expect(wallCoordinates(wall, bread.position)).toBeLessThan(3)
  })
  test('works removed after the update stay removed, and the visitor’s own works are kept', () => {
    const upgraded = validateDocument(upgradeDocument(legacySave()))
    const trimmed = validateDocument({
      ...upgraded,
      portraits: upgraded.portraits.filter(p => p.id !== 'raft'),
    })
    expect(upgradeDocument(trimmed)).toBe(trimmed)
    const legacy = legacySave()
    const own: Portrait = {
      ...initialPortraits[0],
      id: 'visitor-own-work',
      wallId: 'salon-north',
      position: [14, 2.95, -19.78],
      width: 1,
      height: 1,
      rotation: 0,
      hung: true,
    }
    const upgradedWithOwn = validateDocument(upgradeDocument({
      ...legacy,
      portraits: [...legacy.portraits, own],
    }))
    // The raft would overlap the visitor’s own work, so it stays in storage instead of crowding it.
    expect(upgradedWithOwn.portraits.some(p => p.id === 'visitor-own-work')).toBe(true)
    expect(upgradedWithOwn.portraits.some(p => p.id === 'raft')).toBe(false)
    expect(upgradedWithOwn.portraits.some(p => p.id === 'hamster')).toBe(true)
  })
  test('a work with nowhere left on its wall is set down in front of it instead of being lost', () => {
    const legacy = legacySave()
    const wall = walls.find(candidate => candidate.id === 'dine-north')!
    const wide = {
      ...legacy.portraits.find(p => p.id === 'bread')!,
      position: wallPosition(wall, 0, 2.6),
      width: 4,
      height: 2,
    }
    const upgraded = validateDocument(upgradeDocument({
      ...legacy,
      portraits: [...legacy.portraits.filter(p => p.id !== 'bread'), wide],
    }))
    const bread = upgraded.portraits.find(p => p.id === 'bread')!
    expect(bread.hung).toBe(false)
    expect(bread.wallId).toBeUndefined()
    expect(roomAt(bread.position)).toBe('dine')
  })
  test('malformed and future documents are left to validation', () => {
    for (const value of [null, 'x', {
      version: 2,
      portraits: [],
    }, {
      ...createDocument(),
      exhibition: exhibitionRevision + 1,
    }, {
      ...createDocument(),
      exhibition: -1,
    }]) {
      expect(upgradeDocument(value)).toBe(value)
    }
    expect(() => validateDocument({
      ...createDocument(),
      exhibition: exhibitionRevision + 1,
    })).toThrow('newer exhibition')
    expect(() => validateDocument({
      ...createDocument(),
      exhibition: 0.5,
    })).toThrow('newer exhibition')
  })
})
