import type {Portrait, Vec3} from '../../src/lib/gallery/types.ts'
import type {Wall} from '../../src/lib/placement/wallGeometry.ts'

import {describe, expect, test} from 'bun:test'

import levelPlacement from '../../src/levels/gallery/placement.ts'
import {playerSpawn as knotSpawn} from '../../src/levels/knottingham/navigation.ts'
import knotPlacement from '../../src/levels/knottingham/placement.ts'
import {playerSpawn as soundboardSpawn} from '../../src/levels/soundboard/navigation.ts'
import soundboardPlacement from '../../src/levels/soundboard/placement.ts'
import {announcerColumns, soundboardBounds, soundboardButtonsIssue, soundboardLayout, soundboardWalls} from '../../src/lib/audio/soundboard.ts'
import {announcerButton, soundboardButton} from '../../src/lib/audio/SoundboardLayout.ts'
import {archivedSoundEffects, enabledSoundEffects} from '../../src/lib/audio/soundEffects.ts'
import initialPortraits from '../../src/lib/gallery/collection.ts'
import {knotGalleryBounds, knotGalleryCenter, knotGalleryWalls} from '../../src/lib/gallery/knotGallery.ts'
import walls, {findPlacement, galleryPlacement} from '../../src/lib/gallery/walls.ts'
import {HallPlacementSpace} from '../../src/lib/placement/HallPlacementSpace.ts'
import {placementIssues, wallCoordinates, wallPosition} from '../../src/lib/placement/wallGeometry.ts'

const eye = 1.6
const artwork = (patch: Partial<Portrait>): Portrait => ({
  id: 'guest',
  title: 'A guest',
  creator: 'You',
  description: '',
  source: 'guest',
  position: [0, 2.5, 0],
  rotation: 0,
  width: 1.2,
  height: 1.2,
  hung: false,
  ...patch,
})
/** Aim from `distance` meters in front of a wall straight at the point `u` along it at height `y`. */
const aimAt = (wall: Wall, u: number, y: number, distance = 3) => {
  const target = wallPosition(wall, u, y, 0)
  const origin = wallPosition(wall, u, y, distance)
  return {
    origin,
    direction: target.map((n, i) => n - origin[i]).map(n => n / distance) as Vec3,
  }
}
describe('museum placement', () => {
  test('the level module exposes the museum’s placement space', () => {
    expect(levelPlacement).toBe(galleryPlacement)
    expect(galleryPlacement.walls).toBe(walls)
  })
  test('the legacy helper still delegates to it', () => {
    const origin: Vec3 = [4, 2.5, -24]
    const direction: Vec3 = [0, 0, -1]
    expect(findPlacement(origin, direction, 2, 2, [])).toEqual(galleryPlacement.findPlacement(origin, direction, 2, 2, []))
  })
  test('stored collections are never rearranged silently', () => {
    const portraits = initialPortraits.map(p => ({...p}))
    expect(galleryPlacement.settle(portraits)).toBe(portraits)
  })
})
describe('Knottingham placement', () => {
  test('every edge wall takes artworks along its whole free span', () => {
    expect(knotPlacement.walls).toBe(knotGalleryWalls)
    for (const wall of knotGalleryWalls) {
      for (const fraction of [-0.3, 0, 0.3]) {
        const u = fraction * wall.width
        const {origin, direction} = aimAt(wall, u, eye + 0.9)
        const placement = knotPlacement.findPlacement(origin, direction, 1.6, 1.2, [])
        expect(placement).toMatchObject({
          wallId: wall.id,
          inReach: true,
          valid: true,
          reason: '',
        })
        expect(wallCoordinates(wall, placement!.position)).toBeCloseTo(u)
        expect(placement!.position[1]).toBeCloseTo(eye + 0.9)
        expect(Math.abs(Math.sin((placement!.rotation - wall.rotation) / 2))).toBeLessThan(1e-9)
      }
    }
  })
  test('the regular frame, label and neighbor rules still apply', () => {
    const wall = knotGalleryWalls[0]
    const hung = artwork({
      hung: true,
      wallId: wall.id,
      position: wallPosition(wall, 0, 2.5),
      rotation: wall.rotation,
    })
    const {origin, direction} = aimAt(wall, 0.4, 2.5)
    expect(knotPlacement.findPlacement(origin, direction, 1.2, 1.2, [hung])?.reason).toBe(placementIssues.neighbor)
    expect(knotPlacement.findPlacement(origin, direction, 1.2, 1.2, [hung], hung.id)?.valid).toBe(true)
    const low = aimAt(wall, 0, 0.6)
    expect(knotPlacement.findPlacement(low.origin, low.direction, 1.2, 1.2, [])?.reason).toBe(placementIssues.frame)
    const corner = aimAt(wall, wall.width / 2 - 0.2, 2.5)
    expect(knotPlacement.findPlacement(corner.origin, corner.direction, 1.2, 1.2, [])?.reason).toBe(placementIssues.frame)
  })
  test('the nearest wall wins and distant walls are only previewed', () => {
    const origin: Vec3 = [knotGalleryCenter[0], 2.5, knotGalleryBounds.northZ + 2]
    expect(knotPlacement.findPlacement(origin, [0, 0, -1], 1, 1, [])).toMatchObject({
      wallId: 'study-north',
      valid: true,
    })
    const far: Vec3 = [knotGalleryCenter[0], 2.5, knotGalleryBounds.northZ + knotPlacement.reach + 1]
    if (far[2] < knotGalleryBounds.southZ) {
      expect(knotPlacement.findPlacement(far, [0, 0, -1], 1, 1, [])).toMatchObject({
        inReach: false,
        valid: false,
        reason: placementIssues.reach,
      })
    }
    expect(knotPlacement.findPlacement(origin, [0, 1, 0], 1, 1, [])).toBeNull()
  })
  test('the hall is level and lost artworks return to the spawn', () => {
    expect(knotPlacement.floorHeight([knotGalleryCenter[0], 3, knotGalleryCenter[2]])).toBe(0)
    expect(knotPlacement.contains(knotPlacement.recoveryPosition)).toBe(true)
    expect(knotPlacement.recoveryPosition[0]).toBe(knotSpawn.position[0])
    expect(knotPlacement.recoveryPosition[2]).toBe(knotSpawn.position[2])
    expect(knotPlacement.contains([knotGalleryBounds.maxX + 0.5, 1, knotGalleryCenter[2]])).toBe(false)
    expect(knotPlacement.contains([Number.NaN, 1, 0])).toBe(false)
  })
})
const wallById = (id: string) => soundboardWalls.find(wall => wall.id === id)!
const reservation = (id: string) => wallById(id).reservations![0]
const covers = (id: string, [x, y]: readonly [number, number], width: number, height: number) => {
  const panel = reservation(id)
  expect(x - width / 2).toBeGreaterThanOrEqual(panel.u - panel.width / 2 - 1e-9)
  expect(x + width / 2).toBeLessThanOrEqual(panel.u + panel.width / 2 + 1e-9)
  expect(y - height / 2).toBeGreaterThanOrEqual((panel.bottom ?? 0) - 1e-9)
  expect(y + height / 2).toBeLessThanOrEqual(panel.height + 1e-9)
}
describe('Soundboard placement', () => {
  test('every sound and announcer button lies inside its wall’s reservation', () => {
    for (const [id, section, effects] of [['soundboard-enabled', 'enabled', enabledSoundEffects], ['soundboard-archived', 'archived', archivedSoundEffects]] as const) {
      for (const index of effects.keys()) {
        covers(id, soundboardLayout.buttonPosition(section, index), soundboardButton.width, soundboardButton.height)
      }
      covers(id, [0, soundboardLayout.headingY()], soundboardLayout.headingWidth(), 0.58)
    }
    for (const row of [0, 1] as const) {
      for (let index = 0; index < announcerColumns; index++) {
        covers('soundboard-north', soundboardLayout.announcerButtonPosition(announcerColumns, index, row), announcerButton.width, announcerButton.height)
      }
    }
    expect(wallById('soundboard-south').reservations).toBeUndefined()
  })
  test('artworks never hang over or overlap the buttons', () => {
    for (const id of ['soundboard-enabled', 'soundboard-archived', 'soundboard-north']) {
      const wall = wallById(id)
      const panel = reservation(id)
      const middle = ((panel.bottom ?? 0) + panel.height) / 2
      for (const u of [panel.u, panel.u - panel.width / 2 + 0.1, panel.u + panel.width / 2 - 0.1]) {
        const {origin, direction} = aimAt(wall, u, Math.max(1.5, middle))
        expect(soundboardPlacement.findPlacement(origin, direction, 1, 1, [])).toMatchObject({
          wallId: id,
          valid: false,
          reason: soundboardButtonsIssue,
        })
      }
      // A frame just beside the panel still overlaps it with its own width.
      const {origin, direction} = aimAt(wall, panel.u + panel.width / 2 + 0.3, Math.max(1.5, middle))
      expect(soundboardPlacement.findPlacement(origin, direction, 1, 1, [])?.reason).toBe(soundboardButtonsIssue)
    }
  })
  test('the free stretches of every wall take artworks', () => {
    for (const id of ['soundboard-enabled', 'soundboard-archived', 'soundboard-north']) {
      const wall = wallById(id)
      const panel = reservation(id)
      const free = (wall.width / 2 + panel.u + panel.width / 2) / 2
      expect(wall.width / 2 - (panel.u + panel.width / 2)).toBeGreaterThan(2)
      const {origin, direction} = aimAt(wall, free, 2.2)
      expect(soundboardPlacement.findPlacement(origin, direction, 1, 1, [])).toMatchObject({
        wallId: id,
        valid: true,
      })
    }
    const south = wallById('soundboard-south')
    const {origin, direction} = aimAt(south, 0, 2.5)
    expect(soundboardPlacement.findPlacement(origin, direction, 2, 2, [])).toMatchObject({
      wallId: 'soundboard-south',
      valid: true,
    })
  })
  test('the hall is level and lost artworks return to the spawn', () => {
    expect(soundboardPlacement.floorHeight([0, 2, 0])).toBe(0)
    expect(soundboardPlacement.contains(soundboardPlacement.recoveryPosition)).toBe(true)
    expect(soundboardPlacement.recoveryPosition[2]).toBe(soundboardSpawn.position[2])
    expect(soundboardPlacement.contains([0, soundboardBounds.height + 1, 0])).toBe(false)
  })
})
describe('settling stored artworks into a hall', () => {
  const wall = knotGalleryWalls[2]
  test('leaves a collection that still fits untouched', () => {
    const portraits = [
      artwork({
        hung: true,
        wallId: wall.id,
        position: wallPosition(wall, 0, 2.5),
        rotation: wall.rotation,
      }),
      artwork({
        id: 'loose',
        position: [knotGalleryCenter[0], 0.7, knotGalleryCenter[2]],
      }),
    ]
    expect(knotPlacement.settle(portraits)).toBe(portraits)
  })
  test('snaps works back onto a wall that moved', () => {
    const shifted = wallPosition(wall, 1, 2.5, 0.9)
    const [settled] = knotPlacement.settle([
      artwork({
        hung: true,
        wallId: wall.id,
        position: shifted,
        rotation: wall.rotation + 0.1,
      }),
    ]) as Array<Portrait>
    expect(settled.hung).toBe(true)
    expect(settled.position).toEqual(wallPosition(wall, 1, 2.5))
    expect(settled.rotation).toBe(wall.rotation)
  })
  test('takes down works whose wall or spot is gone and keeps loose works inside', () => {
    const hung = artwork({
      hung: true,
      wallId: wall.id,
      position: wallPosition(wall, 0, 2.5),
      rotation: wall.rotation,
    })
    const settled = knotPlacement.settle([
      hung,
      // overlaps the first work
      {
        ...hung,
        id: 'crowded',
      },
      artwork({
        id: 'vanished',
        hung: true,
        wallId: 'lobby-north',
        position: [0, 2.5, -31.78],
      }),
      artwork({
        id: 'outside',
        position: [knotGalleryBounds.maxX + 40, 0.6, 0],
        orientation: [0, 0, 0, 1],
      }),
      {id: 'malformed'},
    ]) as Array<Portrait>
    expect(settled[0]).toBe(hung)
    expect(settled[1]).toMatchObject({
      id: 'crowded',
      hung: false,
      wallId: undefined,
    })
    expect(Math.abs(wallCoordinates(wall, settled[1].position))).toBeLessThan(wall.width / 2)
    expect(settled[1].position[1]).toBeCloseTo(hung.height / 2 + 0.05)
    expect(settled[2]).toMatchObject({
      id: 'vanished',
      hung: false,
      wallId: undefined,
    })
    expect(settled[3].orientation).toBeUndefined()
    for (const portrait of settled.slice(1, 4)) {
      expect(knotPlacement.contains(portrait.position)).toBe(true)
    }
    expect(settled[4] as unknown).toEqual({id: 'malformed'})
  })
  test('rejects recovery positions outside the hall', () => {
    expect(() => new HallPlacementSpace(knotGalleryWalls, knotGalleryBounds, [knotGalleryBounds.maxX + 1, 1, 0])).toThrow(RangeError)
  })
})
