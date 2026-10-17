import {describe, expect, test} from 'bun:test'

import {wallTop} from '../../src/lib/gallery/architecture.ts'
import lobby from '../../src/lib/gallery/lobby.ts'
import lobbyCeiling, {glazingBarOffsets, lobbyBeamBottom, lobbyBeams, lobbyCoffers, lobbyLamps, lobbyOpening} from '../../src/lib/gallery/lobbyCeiling.ts'
import LobbyCeilingGeometry from '../../src/lib/gallery/LobbyCeilingGeometry.ts'
import walls, {rooms} from '../../src/lib/gallery/walls.ts'
import {triangleCount} from '../../src/lib/geometry.ts'
import CofferPlasterMaterial from '../../src/lib/materials/CofferPlasterMaterial.ts'
import LaylightGlassMaterial from '../../src/lib/materials/LaylightGlassMaterial.ts'
import {LanternLight} from '../../src/lib/materials/lights/index.ts'

const room = rooms.find(candidate => candidate.id === 'lobby')!
const halfWidth = room.size[0] / 2
const halfDepth = room.size[1] / 2
const lobbyWalls = walls.filter(wall => wall.room === 'lobby')
/** Top of the cornice’s upper band, as built by the wall geometry. */
const corniceTop = Math.max(...lobbyWalls.map(wall => wall.height)) - 0.22 + 0.23 / 2
const area = (rectangle: {size: readonly [number, number]}) => rectangle.size[0] * rectangle.size[1]
const contains = (outer: {
  center: readonly [number, number]
  size: readonly [number, number]
}, x: number, z: number) => Math.abs(x - outer.center[0]) <= outer.size[0] / 2 + 1e-9 && Math.abs(z - outer.center[1]) <= outer.size[1] / 2 + 1e-9
/** Sine of the elevation of a point seen from a lamp. */
const elevation = (horizontal: number, height: number) => height / Math.hypot(horizontal, height)
const crossBeams = lobbyBeams().filter(beam => beam.axis === 'x')
describe('the Lobby’s coffered laylight ceiling', () => {
  test('coffers tile the whole ceiling without overlapping', () => {
    const coffers = lobbyCoffers()
    expect(coffers.reduce((sum, coffer) => sum + area(coffer), 0)).toBeCloseTo(room.size[0] * room.size[1], 9)
    for (const [i, a] of coffers.entries()) {
      expect(Math.abs(a.center[0]) + a.size[0] / 2).toBeLessThanOrEqual(halfWidth + 1e-9)
      expect(Math.abs(a.center[1]) + a.size[1] / 2).toBeLessThanOrEqual(halfDepth + 1e-9)
      for (const b of coffers.slice(i + 1)) {
        const overlapX = Math.min(a.center[0] + a.size[0] / 2, b.center[0] + b.size[0] / 2) - Math.max(a.center[0] - a.size[0] / 2, b.center[0] - b.size[0] / 2)
        const overlapZ = Math.min(a.center[1] + a.size[1] / 2, b.center[1] + b.size[1] / 2) - Math.max(a.center[1] - a.size[1] / 2, b.center[1] - b.size[1] / 2)
        expect(Math.min(overlapX, overlapZ)).toBeLessThanOrEqual(1e-9)
      }
    }
  })
  test('the laylight band is as wide as the floor opening, and one laylight mirrors the opening exactly', () => {
    const laylights = lobbyCoffers().filter(coffer => coffer.laylight)
    expect(laylights.length).toBeGreaterThan(5)
    for (const laylight of laylights) {
      expect(laylight.center[0]).toBe(lobbyOpening.center[0])
      expect(laylight.size[0]).toBe(lobbyOpening.size[0])
    }
    const overOpening = laylights.filter(laylight => contains(laylight, ...lobbyOpening.center))
    expect(overOpening).toHaveLength(1)
    expect(overOpening[0].center).toEqual(lobbyOpening.center)
    expect(overOpening[0].size).toEqual(lobbyOpening.size)
    // No beam crosses the laylight over the opening.
    for (const beam of crossBeams) {
      if (contains(overOpening[0], 0, beam.at) && Math.abs(Math.abs(beam.at - lobbyOpening.center[1]) - lobbyOpening.size[1] / 2) > 1e-9) {
        expect(Math.max(beam.from, beam.to) <= -lobbyOpening.size[0] / 2 || Math.min(beam.from, beam.to) >= lobbyOpening.size[0] / 2).toBe(true)
      }
    }
  })
  test('every laylight field holds whole panes, so no glazing bar runs into the frame', () => {
    for (const {field, laylight} of lobbyCoffers()) {
      expect(field.size[0]).toBeGreaterThan(0)
      expect(field.size[1]).toBeGreaterThan(0)
      if (laylight) {
        for (const length of field.size) {
          const offsets = glazingBarOffsets(length)
          expect(offsets).toHaveLength(Math.round(length / lobbyCeiling.pane) - 1)
          expect(offsets.every(offset => Math.abs(offset) < length / 2 - lobbyCeiling.bar.rim)).toBe(true)
        }
      }
    }
    expect(() => glazingBarOffsets(lobbyCeiling.pane * 2.5)).toThrow(RangeError)
  })
  test('beams stay above the cornice and the main entrance’s keystone, and below the slab', () => {
    expect(lobbyBeamBottom).toBeGreaterThan(corniceTop)
    expect(lobbyBeamBottom).toBeGreaterThan(5.16)
    expect(lobbyCeiling.underside).toBeLessThan(wallTop)
    expect(lobbyCeiling.underside).toBeCloseTo(lobbyCeiling.slabY - lobbyCeiling.slabThickness / 2, 9)
  })
  test('the geometry is finite, stays inside the room and under the slab, and is cheap', () => {
    const geometry = new LobbyCeilingGeometry
    try {
      for (const part of [geometry.plaster, geometry.bars, geometry.glass]) {
        const positions = part.getAttribute('position').array
        expect(positions.every(Number.isFinite)).toBe(true)
        part.computeBoundingBox()
        const box = part.boundingBox!
        expect(box.min.x).toBeGreaterThanOrEqual(-halfWidth - lobbyCeiling.beam.lipWidth / 2 - 1e-6)
        expect(box.max.x).toBeLessThanOrEqual(halfWidth + lobbyCeiling.beam.lipWidth / 2 + 1e-6)
        expect(box.max.y).toBeLessThanOrEqual(lobbyCeiling.underside + 1e-6)
        expect(box.min.y).toBeGreaterThanOrEqual(lobbyBeamBottom - 1e-6)
      }
      // The glass faces down, toward the room.
      const normals = geometry.glass.getAttribute('normal')
      for (let i = 0; i < normals.count; i++) {
        expect(normals.getY(i)).toBeCloseTo(-1, 6)
      }
      const triangles = triangleCount(geometry.plaster) + triangleCount(geometry.bars) + triangleCount(geometry.glass)
      expect(triangles).toBeLessThan(10_000)
    } finally {
      geometry.dispose()
    }
  })
  test('each lamp hangs in the middle of a bay, under the laylight band, away from every cross beam', () => {
    const laylights = lobbyCoffers().filter(coffer => coffer.laylight)
    // Beams that cross the band over the lamps; the side bays’ beams end 4 m away from them.
    const beamLines = new Set(crossBeams.filter(beam => beam.from < 0 && beam.to > 0).map(beam => beam.at))
    expect(lobbyLamps.offsets).toContain(lobbyLamps.shadowCaster)
    expect(contains({
      center: lobbyOpening.center,
      size: lobbyOpening.size,
    }, 0, lobbyLamps.shadowCaster)).toBe(true)
    for (const z of lobbyLamps.offsets) {
      expect(laylights.some(laylight => contains(laylight, 0, z))).toBe(true)
      const nearest = Math.min(...[...beamLines].map(line => Math.abs(line - z)))
      expect(nearest).toBeGreaterThanOrEqual(lobbyCeiling.bay / 2 - 1e-9)
      expect(Math.abs(z)).toBeLessThan(halfDepth)
      expect(lobbyLamps.y).toBeLessThan(lobbyBeamBottom)
    }
    expect(lobby.opening.center[1] - room.center[1]).toBe(lobbyLamps.shadowCaster)
  })
  test('the lamps’ roof spares the walls and cornice but shades the beams beside them', () => {
    const lamp = new LanternLight({roof: lobbyLamps.roof})
    // The cornice top, 8 m to the side, and the nearest wall’s upper edge down the room.
    expect(lamp.transmission(elevation(halfWidth, corniceTop - lobbyLamps.y))).toBe(1)
    expect(lamp.transmission(elevation(halfWidth, wallTop - 0.3 - lobbyLamps.y))).toBe(1)
    // The side of a cross beam, half a bay away, from its soffit up to the slab.
    const beamSide = lobbyCeiling.bay / 2 - lobbyCeiling.beam.width / 2
    expect(lamp.transmission(elevation(beamSide, lobbyBeamBottom - lobbyLamps.y))).toBeLessThan(0.5)
    expect(lamp.transmission(elevation(beamSide, lobbyCeiling.underside - lobbyLamps.y))).toBeCloseTo(lobbyLamps.roof.leak, 6)
    // Straight down is untouched.
    expect(lamp.transmission(-1)).toBe(1)
  })
  test('materials build their nodes and reject impossible settings', () => {
    const fields = lobbyCoffers().filter(coffer => coffer.laylight).map(coffer => coffer.field)
    const plaster = new CofferPlasterMaterial({
      fields,
      glassY: lobbyCeiling.underside,
    })
    const glass = new LaylightGlassMaterial(lobbyCeiling.pane, [0, 0], {fieldFalloff: 0.2})
    try {
      expect(plaster.emissiveNode?.isNode).toBe(true)
      expect(glass.colorNode?.isNode).toBe(true)
    } finally {
      plaster.dispose()
      glass.dispose()
    }
    expect(() => new CofferPlasterMaterial({
      fields: [],
      glassY: 5,
    })).toThrow(RangeError)
    expect(() => new CofferPlasterMaterial({
      fields,
      glassY: 5,
      reach: 0,
    })).toThrow(RangeError)
    expect(() => new LaylightGlassMaterial(1, [0, 0], {fieldFalloff: 1.5})).toThrow(RangeError)
    expect(() => new LaylightGlassMaterial(1, [0, 0], {brightness: 1.2})).toThrow(RangeError)
    expect(() => new LaylightGlassMaterial(0, [0, 0])).toThrow(RangeError)
  })
})
