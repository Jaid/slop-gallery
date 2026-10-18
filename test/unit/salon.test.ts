import {beforeEach, describe, expect, test} from 'bun:test'

import {wallFace} from '../../src/lib/gallery/architecture.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {portraitLabelLayout} from '../../src/lib/gallery/portraitLabel.ts'
import {salonBench, salonCeiling, salonLaylight, salonLightOffsets, salonLightY, salonWainscot, wainscotFields, wallDressingSpans} from '../../src/lib/gallery/salon.ts'
import {createDocument, restoreDocument, useGallery} from '../../src/lib/gallery/store.ts'
import walls, {floorHeight, insideGallery, insideOpening, placementIssue, roomAt, rooms, roomVisit, wallCoordinates, wallPosition} from '../../src/lib/gallery/walls.ts'
import ParquetFloorMaterial, {herringboneBlock, salonParquet} from '../../src/lib/materials/ParquetFloorMaterial.ts'

const room = rooms.find(candidate => candidate.id === 'salon')!
const shipped = {
  ...createDocument(),
  portraits: initialPortraits.map(p => ({...p})),
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
    for (const [x, z] of [[8.5, -19.5], [19.5, -8.5], [14, -14], [8.5, -31.5], [19.5, -31.5]]) {
      expect(roomAt([x, 1.7, z])).toBe('salon')
      expect(floorHeight([x, 1.7, z])).toBe(0)
    }
    expect(insideGallery([20.5, 1.7, -14])).toBe(false)
    expect(insideGallery([14, 1.7, -32.5])).toBe(false)
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
    expect(hung.map(p => p.id).toSorted()).toEqual(['alpacas', 'corgi', 'gleaners', 'gnomes', 'hamster', 'jatte', 'kiss', 'noodles', 'onion', 'otter', 'penguins', 'raccoons', 'raft', 'scream', 'swing', 'venus', 'walrus', 'wanderer', 'wave'])
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
  test('the laylights hang inside the room, apart, under its slab and each above its lamp', () => {
    const {centers, depth, frame, glassY, opening, panes} = salonLaylight
    expect(opening / 2 + frame).toBeLessThan(room.size[0] / 2)
    expect(centers).toHaveLength(2)
    for (const z of centers) {
      expect(Math.abs(z) + opening / 2 + frame).toBeLessThan(room.size[1] / 2)
    }
    // Their coffers don’t touch, and they share one pane grid.
    expect(centers[1] - centers[0]).toBeGreaterThan(opening + frame * 2)
    expect((centers[1] - centers[0]) / (opening / panes) % 1).toBeCloseTo(0, 9)
    expect(glassY).toBeLessThan(salonCeiling.underside)
    expect(salonCeiling.underside - depth).toBeGreaterThan(salonLightY + 0.6)
    expect(salonLightOffsets).toHaveLength(centers.length)
    for (const z of salonLightOffsets) {
      expect(centers.some(center => Math.abs(z - center) < opening / 2)).toBe(true)
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
        expect(material.colorNode?.isNode).toBe(true)
        expect(material.normalNode?.isNode).toBe(true)
        expect(material.roughnessNode?.isNode).toBe(true)
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
