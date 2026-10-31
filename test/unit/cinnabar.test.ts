import {describe, expect, test} from 'bun:test'

import RAPIER from '@dimforge/rapier3d-compat'
import {DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3} from 'three/webgpu'

import {createArchitectureGeometry, wallFace, wallOpeningTrim} from '../../src/lib/gallery/architecture.ts'
import cinnabar, {cinnabarFresco, cinnabarRooflight, cinnabarTerrazzo, frescoLayout} from '../../src/lib/gallery/cinnabar.ts'
import roomOrigins from '../../src/lib/gallery/layout.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import salon, {salonCeiling} from '../../src/lib/gallery/salon.ts'
import {vesper} from '../../src/lib/gallery/vesper.ts'
import CinnabarWallMaterial from '../../src/lib/materials/CinnabarWallMaterial.ts'
import TerrazzoFloorMaterial, {blackTerrazzo, venetianTerrazzo} from '../../src/lib/materials/TerrazzoFloorMaterial.ts'
import {insideOpening, wallCoordinates} from '../../src/lib/placement/wallGeometry.ts'
import {openings} from '../../src/worlds/gallery/relations.ts'
import walls, {floorHeight, insideGallery, roomAt, rooms, roomVisit} from './fixtures/gallery.ts'

await RAPIER.init()
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
    expect(roomAt([-14, 1.7, -32.5])).toBe('fortress')
    expect(insideGallery([-18, 1.7, -32.5])).toBe(false)
    expect(roomAt(roomVisit(room).position)).toBe('cinnabar')
  })
  test('a solid shared wall separates the Vesper and the Cinnabar', () => {
    const vesperNorth = wallById('vesper-north')
    const cinnabarSouth = wallById('cinnabar-south')
    expect(vesperNorth.center).toEqual(cinnabarSouth.center)
    expect(Math.abs(Math.cos(vesperNorth.rotation - cinnabarSouth.rotation) + 1)).toBeLessThan(1e-12)
    for (const wall of [vesperNorth, cinnabarSouth]) {
      expect(wall.holes ?? []).toHaveLength(0)
      const geometry = createArchitectureGeometry(wall)
      const material = new MeshBasicMaterial({side: DoubleSide})
      const world = new RAPIER.World({
        x: 0,
        y: 0,
        z: 0,
      })
      try {
        const mesh = new Mesh(geometry.surface, material)
        for (const [vertices, indices] of geometry.collision) {
          world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices))
        }
        world.step()
        for (const y of [0.5, 1.7, 3.5]) {
          for (const side of [-1, 1]) {
            const origin = new Vector3(0, y, side)
            const direction = new Vector3(0, 0, -side)
            const ray = new Raycaster(origin, direction, 0, 2)
            expect(ray.intersectObject(mesh).length).toBeGreaterThan(0)
            expect(world.castRay(new RAPIER.Ray(origin, direction), 2, true)).not.toBeNull()
          }
        }
      } finally {
        world.free()
        geometry.dispose()
        material.dispose()
      }
    }
    expect(openings.some(({rooms: pair}) => pair.includes('vesper') && pair.includes('cinnabar'))).toBe(false)
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
    // One panel on either side of the arch on the north wall, three across the blank south wall and four down the east and west walls.
    expect(frescoLayout(wallById('cinnabar-north')).panels).toHaveLength(3)
    expect(frescoLayout(wallById('cinnabar-east')).panels).toHaveLength(4)
    expect(frescoLayout(wallById('cinnabar-south')).panels.map(panel => panel.pierced)).toEqual([false, false, false])
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
        expect(floor.mirrored.value).toBe(1)
      } finally {
        floor.dispose()
      }
    }
    // The Cinnabar’s polish mirrors as strongly and clearly as the Banquet’s marble.
    const polished = new TerrazzoFloorMaterial({
      center: room.center,
      size: room.size,
      field: venetianTerrazzo,
      border: blackTerrazzo,
      inset: cinnabarTerrazzo.border,
      reflections: true,
      strength: 0.4,
      grazingStrength: 0.2,
      loss: 0,
      roughness: 0.1,
    })
    try {
      expect(polished.reflection).not.toBeNull()
      expect(polished.reflectionTarget).not.toBeNull()
      expect(polished.roughness).toBe(0.1)
    } finally {
      polished.dispose()
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
