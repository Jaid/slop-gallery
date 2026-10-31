import {describe, expect, test} from 'bun:test'

import {wallFace, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import cinnabar, {cinnabarFresco, cinnabarPedestal, cinnabarRooflight, cinnabarTerrazzo, frescoLayout} from '../../src/lib/gallery/cinnabar.ts'
import roomOrigins from '../../src/lib/gallery/layout.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import salon, {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {vesper} from '../../src/lib/gallery/vesper.ts'
import CinnabarWallMaterial from '../../src/lib/materials/CinnabarWallMaterial.ts'
import TerrazzoFloorMaterial, {blackTerrazzo, venetianTerrazzo} from '../../src/lib/materials/TerrazzoFloorMaterial.ts'
import {insideOpening, wallCoordinates} from '../../src/lib/placement/wallGeometry.ts'
import walls, {floorHeight, insideGallery, roomAt, rooms, roomVisit} from './fixtures/gallery.ts'

const room = rooms.find(candidate => candidate.id === 'cinnabar')!
const wallById = (id: string) => walls.find(wall => wall.id === id)!
/** the positions sorted and rounded to micrometers, for comparing layouts */
const rounded = (list: ReadonlyArray<number>) => list.toSorted((a, b) => a - b).map(at => Math.round(at * 1e6) + 0)
describe('the Cinnabar', () => {
  test('mirrors the Salon across the Lobby’s north extension, north of the Vesper, which mirrors the Banquet', () => {
    const salonRoom = rooms.find(candidate => candidate.id === 'salon')!
    const vesperRoom = rooms.find(candidate => candidate.id === 'vesper')!
    const banquet = rooms.find(candidate => candidate.id === 'banquet')!
    expect(room.floorY).toBe(0)
    expect(room.center).toEqual([-salonRoom.center[0], salonRoom.center[1]])
    expect(room.size).toEqual(salonRoom.size)
    expect(cinnabar.size).toEqual(salon.size)
    expect(vesperRoom.center).toEqual([-banquet.center[0], banquet.center[1]])
    expect(vesperRoom.size).toEqual(banquet.size)
    expect(vesper.size).toEqual([12, 24])
    expect(roomOrigins.vesper).toEqual([-14, 0, -4])
    // Against the Lobby’s west extension, with the Vesper south of it
    expect(room.center[0] + room.size[0] / 2).toBe(-8)
    expect(room.center[1] + room.size[1] / 2).toBe(vesperRoom.center[1] - vesperRoom.size[1] / 2)
    for (const [x, z] of [[-8.5, -19.5], [-19.5, -16.5], [-14, -24], [-8.5, -31.5], [-19.5, -31.5]]) {
      expect(roomAt([x, 1.7, z])).toBe('cinnabar')
      expect(floorHeight([x, 1.7, z])).toBe(0)
    }
    expect(roomAt([-14, 1.7, -12])).toBe('vesper')
    // Behind its north wall lies the Bastion’s approach, in the middle; beside that, nothing.
    expect(roomAt([-14, 1.7, -32.5])).toBe('bastion')
    expect(insideGallery([-18, 1.7, -32.5])).toBe(false)
    expect(roomAt(roomVisit(room).position)).toBe('cinnabar')
  })
  test('one shared arch joins the Vesper and the Cinnabar, back to back on the same plane, like the Banquet’s and the Salon’s', () => {
    const vesperNorth = wallById('vesper-north')
    const cinnabarSouth = wallById('cinnabar-south')
    expect(vesperNorth.center).toEqual(cinnabarSouth.center)
    expect(Math.abs(Math.cos(vesperNorth.rotation - cinnabarSouth.rotation) + 1)).toBeLessThan(1e-12)
    const doorway = [-14, 1.7, -16] as const
    for (const wall of [vesperNorth, cinnabarSouth]) {
      expect(wall.holes).toHaveLength(1)
      expect(wall.holes![0]).toMatchObject(salon.doorway)
      expect(insideOpening(wall.holes![0], wallCoordinates(wall, [...doorway]), 1.7)).toBe(true)
    }
    expect(roomAt([-14, 1.7, -15.9])).toBe('vesper')
    expect(roomAt([-14, 1.7, -16.1])).toBe('cinnabar')
    // The Vesper keeps its doors to the Lobby and the Sienna.
    const vesperEast = wallById('vesper-east')
    expect(vesperEast.holes).toHaveLength(1)
    expect(insideOpening(vesperEast.holes![0], wallCoordinates(vesperEast, [-8, 0, lobby.sideDoorZ]), 1.7)).toBe(true)
    const vesperSouth = wallById('vesper-south')
    expect(insideOpening(vesperSouth.holes![0], wallCoordinates(vesperSouth, [-10.2, 0, 8]), 1.7)).toBe(true)
    expect(roomAt([-14, 1.7, 7.9])).toBe('vesper')
  })
  test('the pedestal stands in the middle of the room, under the rooflight, clear of the doorways', () => {
    expect(cinnabarPedestal).toEqual([room.center[0], 0, room.center[1]])
    expect(roomAt([cinnabarPedestal[0], 1.7, cinnabarPedestal[2]])).toBe('cinnabar')
    expect(room.size[1] / 2 - 0.58).toBeGreaterThan(4)
  })
  test('the rooflight is a round opening in whole panes, inside the room, under its slab, within the sun’s reach', () => {
    const {bead, depth, frame, glassY, pane, radius} = cinnabarRooflight
    expect(radius * 2 / pane % 1).toBeCloseTo(0, 9)
    expect(radius + frame).toBeLessThan(Math.min(...room.size) / 2 - 1)
    expect(glassY).toBeLessThan(salonCeiling.underside)
    expect(salonCeiling.underside - depth - bead).toBeGreaterThan(5)
    expect(room.room.sunlit).toBe(true)
    expect(room.room.hasVolumetricSun).toBe(true)
  })
  test('the fresco lays its bands and panels out around each wall’s doorways, a band flanking every doorway and every panel framed but the pierced ones', () => {
    const {band, openingMargin, panelLength, socle, frieze} = cinnabarFresco
    expect(frieze[1]).toBeLessThan(5.5 - 0.47)
    expect(socle).toBeGreaterThan(0.44)
    for (const id of ['north', 'east', 'south', 'west']) {
      const wall = wallById(`cinnabar-${id}`)
      const {bands, panels} = frescoLayout(wall)
      const end = wall.width / 2 - wallFace
      // Panels tile the wall face from corner to corner, a band between any two of them, each about a panel long unless a doorway stands in it.
      expect(panels[0].u[0]).toBeCloseTo(-end, 9)
      expect(panels.at(-1)!.u[1]).toBeCloseTo(end, 9)
      for (const [index, panel] of panels.entries()) {
        if (index) {
          const gap = panel.u[0] - panels[index - 1].u[1]
          expect(gap).toBeCloseTo(band, 9)
          expect(bands.some(at => Math.abs(at - (panel.u[0] - band / 2)) < 1e-9)).toBe(true)
        }
        if (panel.pierced) {
          continue
        }
        expect(panel.u[1] - panel.u[0]).toBeGreaterThan(panelLength * 0.6)
        expect(panel.u[1] - panel.u[0]).toBeLessThan(panelLength * 1.5)
      }
      expect(bands).toHaveLength(panels.length - 1)
      // Bands are symmetric about the wall’s middle, and stand off the doorways’ casings by the margin.
      expect(rounded(bands.map(at => -at))).toEqual(rounded(bands))
      for (const hole of wall.holes ?? []) {
        const pierced = panels.find(panel => panel.pierced && panel.u[0] < hole.u && hole.u < panel.u[1])!
        expect(pierced).toBeDefined()
        expect(pierced.u[0]).toBeCloseTo(hole.u - hole.width / 2 - wallOpeningTrim - openingMargin, 9)
        expect(pierced.u[1]).toBeCloseTo(hole.u + hole.width / 2 + wallOpeningTrim + openingMargin, 9)
      }
      expect(panels.filter(panel => panel.pierced)).toHaveLength(wall.holes?.length ?? 0)
    }
    // One panel on either side of the arch on the north and south walls, four down the blank east and west walls
    expect(frescoLayout(wallById('cinnabar-north')).panels).toHaveLength(3)
    expect(frescoLayout(wallById('cinnabar-east')).panels).toHaveLength(4)
    expect(frescoLayout(wallById('cinnabar-south')).panels.map(panel => panel.pierced)).toEqual([false, true, false])
    expect(frescoLayout(wallById('cinnabar-west')).panels).toHaveLength(4)
  })
  test('its materials build their surface nodes', () => {
    const wall = new CinnabarWallMaterial(frescoLayout(wallById('cinnabar-south')))
    try {
      for (const node of [wall.colorNode, wall.roughnessNode, wall.normalNode]) {
        expect(node?.isNode).toBe(true)
      }
    } finally {
      wall.dispose()
    }
    for (const reflections of [true, false]) {
      const floor = new TerrazzoFloorMaterial({
        center: room.center,
        size: room.size,
        field: venetianTerrazzo,
        border: blackTerrazzo,
        inset: cinnabarTerrazzo.border,
        reflections,
      })
      try {
        for (const node of [floor.colorNode, floor.roughnessNode, floor.normalNode]) {
          expect(node?.isNode).toBe(true)
        }
        expect(Boolean(floor.reflection)).toBe(reflections)
      } finally {
        floor.dispose()
      }
    }
    expect(() => new TerrazzoFloorMaterial({
      center: [0, 0],
      size: [0, 1],
      field: venetianTerrazzo,
    })).toThrow(RangeError)
    // The border lies inside the brass inlays, which every stone floor lays 1.25 m from the walls.
    expect(cinnabarTerrazzo.border).toBe(1.25)
  })
})
