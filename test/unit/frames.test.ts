import type {PortraitRatio, Vec3} from '../../src/lib/gallery/types.ts'

import {describe, expect, test} from 'bun:test'

import {frameBack, frameTriangleBudget, maximumFrameReach} from '../../src/lib/frames/base/PortraitFrame.ts'
import {choiceFrames, pickFrame} from '../../src/lib/frames/frameChoice.ts'
import {frameIds, readFrame} from '../../src/lib/frames/frameParameter.ts'
import {classicFrame, frames, portraitFrame} from '../../src/lib/frames/index.ts'
import {arrivalFrame} from '../../src/lib/gallery/actions.ts'
import {wallFace} from '../../src/lib/gallery/architectureDimensions.ts'
import {hangDefaultWorks} from '../../src/lib/gallery/defaultPortraits.ts'
import {imageSize} from '../../src/lib/gallery/ImageImporter.ts'
import {orbs} from '../../src/lib/gallery/orbs/index.ts'
import {portraitRatios, slotAreas, slotFrame} from '../../src/lib/placement/portraitSlots.ts'
import {hangingOffset} from '../../src/lib/placement/wallGeometry.ts'
import artworks from '../../src/worlds/gallery/artworks.ts'
import slopGallery from '../../src/worlds/gallery/index.ts'
import sandbox from '../../src/worlds/sandbox/index.ts'

const entries = Object.entries(frames)
/** every size a work can come in: each slot ratio at each slot area, and imported images at both of the crop’s limits and square */
const sizes = [
  ...Object.keys(portraitRatios).flatMap(ratio => slotAreas.map(area => slotFrame(ratio as PortraitRatio, area))),
  ...[[2, 1], [1, 2], [1, 1]].map(([width, height]) => imageSize(width, height)),
]
describe('frames', () => {
  test('every id has a frame and the default comes first', () => {
    expect(Object.keys(frames)).toEqual([...frameIds])
    expect(frameIds[0]).toBe('classic')
    expect(frames.classic).toBe(classicFrame)
  })
  for (const [id, frame] of entries) {
    test(`${id} stays within its budget and envelope at every size`, () => {
      expect(frame.reach).toBeGreaterThan(0)
      expect(frame.reach).toBeLessThanOrEqual(maximumFrameReach)
      expect(frame.imageDepth).toBeGreaterThan(frameBack)
      expect(frame.imageDepth).toBeLessThan(frame.front)
      const materials = frame.materials
      for (const {width, height} of sizes) {
        const geometry = frame.createGeometry(width, height)
        try {
          const triangles = geometry.getAttribute('position').count / 3
          expect(triangles).toBeLessThanOrEqual(frameTriangleBudget)
          // Every triangle belongs to exactly one group, whose material exists.
          expect(geometry.groups.reduce((sum, group) => sum + group.count, 0)).toBe(triangles * 3)
          for (const group of geometry.groups) {
            expect(materials[group.materialIndex!]).toBeDefined()
          }
          // Nothing reaches into the wall behind the frame, nor out past the reach the clearance between hung works leaves room for.
          const box = geometry.boundingBox!
          expect(box.min.z).toBeGreaterThan(wallFace - hangingOffset)
          for (const [low, high, half] of [[box.min.x, box.max.x, width / 2], [box.min.y, box.max.y, height / 2]]) {
            expect(Math.max(-low, high)).toBeLessThanOrEqual(half + maximumFrameReach + 1e-6)
          }
          expect(Number.isFinite(box.min.x + box.max.x + box.min.y + box.max.y)).toBe(true)
        } finally {
          geometry.dispose()
        }
      }
    })
  }
  test('?frame forces one of them or nothing', () => {
    const id = frameIds.at(-1)!
    expect(readFrame(`https://example.com/?frame=${id}`)).toBe(id)
    expect(readFrame('https://example.com/?frame=gilded-potato')).toBe('')
    expect(readFrame('https://example.com/')).toBe('')
    expect(portraitFrame()).toBe(classicFrame)
    expect(portraitFrame(id)).toBe(frames[id])
  })
})
const seeds = Array.from({length: 64}, (_, index) => index * 7919 + 1)
/** every room of both worlds, once for a room in both */
const rooms = new Map([...slopGallery.rooms, ...sandbox.rooms].map(room => [room.id, room.room]))
/** the frame choices of the rooms that have one */
const roomChoices = rooms.values().flatMap(room => (room.frame ? [room.frame] : [])).toArray()
describe('frame choices', () => {
  test('a single frame is always picked, and of several, every seed picks one for the whole game, which one depending on the seed', () => {
    expect(pickFrame(5, 'lodge-tramp')).toBe('lodge-tramp')
    expect(choiceFrames('lodge-tramp')).toEqual(['lodge-tramp'])
    for (const choice of [...roomChoices, ...orbs.map(orb => orb.frame)]) {
      const picks = new Set(seeds.map(seed => pickFrame(seed, choice)))
      expect([...picks].every(id => choiceFrames(choice).includes(id))).toBe(true)
      expect(picks.size).toBe(choiceFrames(choice).length)
    }
  })
  test('rooms and ingredients each pick on their own, so a seed does not pick the first frame everywhere', () => {
    const several = [...roomChoices, ...orbs.map(orb => orb.frame)].filter(choice => choiceFrames(choice).length > 1)
    for (const seed of seeds.slice(0, 8)) {
      const positions = new Set(several.map(choice => choiceFrames(choice).indexOf(pickFrame(seed, choice))))
      expect(positions.size).toBeGreaterThan(1)
    }
  })
  test('every frame but the default is brought by exactly one room or ingredient', () => {
    const brought = [...roomChoices, ...orbs.map(orb => orb.frame)].flatMap(choice => choiceFrames(choice))
    expect(brought.toSorted()).toEqual(frameIds.filter(id => id !== 'classic').toSorted())
  })
})
describe('room frames', () => {
  test('every slot carries the frame its room wears in the game, and every default work wears the frame of its slot', () => {
    for (const seed of seeds.slice(0, 4)) {
      for (const world of [slopGallery, sandbox]) {
        for (const room of world.rooms) {
          const frame = room.frame(seed)
          expect(frame).toBe(room.room.frame && pickFrame(seed, room.room.frame))
          for (const slot of room.slots(seed)) {
            expect(slot.frame).toBe(frame)
          }
        }
      }
      const slots = slopGallery.portraitSlots(seed)
      for (const portrait of hangDefaultWorks(slots, artworks, seed)) {
        const slot = slots.find(candidate => candidate.wallId === portrait.wallId && candidate.position.every((value, axis) => value === portrait.position[axis]))!
        expect(portrait.frame).toBe(slot.frame)
        expect(portrait.frame).toBe(slopGallery.roomById(slopGallery.walls.find(wall => wall.id === portrait.wallId)!.room)!.frame(seed))
      }
    }
  })
  test('rooms frame the works arriving in them, and a work arriving outside of every room takes the frame of the room it came from', () => {
    for (const seed of seeds.slice(0, 4)) {
      for (const room of slopGallery.rooms) {
        const inside = room.spawn.position
        const lifted: Vec3 = [inside[0], inside[1] + 1.2, inside[2]]
        expect(arrivalFrame(lifted, lifted, seed)).toBe(room.frame(seed))
      }
      const lobby = slopGallery.room('lobby')
      const outside: Vec3 = [1e4, 0, 1e4]
      expect(slopGallery.roomAt(outside)).toBeUndefined()
      expect(arrivalFrame(outside, lobby.spawn.position, seed)).toBe(lobby.frame(seed))
    }
  })
})
